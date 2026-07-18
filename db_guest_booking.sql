-- ═══════════════════════════════════════════════════════════════
--  비회원 예약 (Guest booking)
--  실행: 슈파베이스 → SQL Editor → 붙여넣고 Run
--  여러 번 실행해도 안전하게 만들었다.
-- ═══════════════════════════════════════════════════════════════
--
--  왜 필요한가
--  ───────────
--  지금은 예약 버튼을 누르면 회원가입 창이 먼저 뜬다. 디자이너 19명 전원이 그렇다.
--  서울 여행 준비하는 외국인이 포트폴리오 보고 마음에 들어서 예약을 누르면
--  거기서 가입을 해야 한다. 그래서 실제 손님 예약이 0건이다.
--
--  이 스크립트는 예약 테이블이 "회원이 아닌 사람"도 받을 수 있게 바꾼다.
--  이름과 연락처만 남기면 예약이 들어간다. 쇼핑몰 비회원 주문과 같은 방식.
--
--  안전장치
--  ───────────
--  · 익명은 예약을 넣을 수만 있고, 읽을 수는 없다(다른 손님 연락처가 새면 안 된다).
--  · 상태는 무조건 pending 으로 강제한다. 스스로 "확정"으로 넣지 못한다.
--  · 결제 관련 칸은 익명이 못 건드린다.
--  · 도배 방지: 같은 디자이너에게 1시간 10건 / 하루 30건까지만.
--  · 같은 연락처로 하루 5건까지만.

begin;

-- ── 1. 회원 없이도 예약이 되도록 ──────────────────────────────
alter table public.bookings alter column customer drop not null;

alter table public.bookings add column if not exists guest_name    text;
alter table public.bookings add column if not exists guest_contact text;
alter table public.bookings add column if not exists guest_lang    text;

comment on column public.bookings.guest_name    is '비회원 예약자 이름';
comment on column public.bookings.guest_contact is '비회원 연락처(이메일·인스타 아이디·카톡 등). 디자이너만 볼 수 있다.';
comment on column public.bookings.guest_lang    is '예약 당시 앱 언어. 디자이너가 어떤 말로 답할지 판단하는 용도.';

-- 회원이거나, 아니면 이름+연락처가 반드시 있어야 한다
alter table public.bookings drop constraint if exists bookings_customer_or_guest;
alter table public.bookings add  constraint bookings_customer_or_guest check (
  customer is not null
  or (coalesce(btrim(guest_name),'') <> '' and coalesce(btrim(guest_contact),'') <> '')
);

-- 디자이너가 "받은 예약"을 열 때 쓰는 인덱스
create index if not exists bookings_designer_created_idx
  on public.bookings (designer, created_at desc);

-- ── 2. 익명 예약 검증·도배 방지 ───────────────────────────────
create or replace function public.guard_guest_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n_hour int;
  n_day  int;
  n_contact int;
begin
  -- 로그인한 사용자의 예약은 여기서 손대지 않는다
  if new.customer is not null then
    return new;
  end if;

  -- 익명은 무조건 대기 상태로 들어간다. 결제 칸도 못 채운다.
  new.status               := 'pending';
  new.deposit_status       := 'none';
  new.deposit_amount       := null;
  new.deposit_currency     := null;
  new.stripe_session_id    := null;
  new.stripe_payment_intent:= null;

  new.guest_name    := left(btrim(new.guest_name), 60);
  new.guest_contact := left(btrim(new.guest_contact), 120);
  new.guest_lang    := left(coalesce(btrim(new.guest_lang),''), 8);
  new.note          := left(coalesce(new.note,''), 1000);

  if new.guest_name = '' or new.guest_contact = '' then
    raise exception '이름과 연락처를 입력해주세요';
  end if;

  -- 존재하는 디자이너에게만
  if not exists (select 1 from public.profiles p where p.id = new.designer and p.role = 'designer') then
    raise exception '디자이너를 찾을 수 없습니다';
  end if;

  -- 지난 날짜로는 못 넣는다
  if new.date is null or new.date < (current_date - 1) then
    raise exception '날짜를 다시 선택해주세요';
  end if;

  -- 도배 방지
  select count(*) into n_hour from public.bookings b
    where b.designer = new.designer and b.customer is null
      and b.created_at > now() - interval '1 hour';
  if n_hour >= 10 then
    raise exception '잠시 후 다시 시도해주세요';
  end if;

  select count(*) into n_day from public.bookings b
    where b.designer = new.designer and b.customer is null
      and b.created_at > now() - interval '1 day';
  if n_day >= 30 then
    raise exception '잠시 후 다시 시도해주세요';
  end if;

  select count(*) into n_contact from public.bookings b
    where b.customer is null and lower(b.guest_contact) = lower(new.guest_contact)
      and b.created_at > now() - interval '1 day';
  if n_contact >= 5 then
    raise exception '오늘은 더 이상 예약할 수 없어요';
  end if;

  -- 같은 디자이너·같은 시간대 중복 방지
  if exists (
    select 1 from public.bookings b
     where b.designer = new.designer and b.date = new.date and b.time = new.time
       and b.status in ('pending','accepted')
  ) then
    raise exception '이미 예약된 시간이에요';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_guest_booking on public.bookings;
create trigger trg_guard_guest_booking
  before insert on public.bookings
  for each row execute function public.guard_guest_booking();

-- ── 3. 권한 ───────────────────────────────────────────────────
alter table public.bookings enable row level security;

-- 익명은 "넣기"만. 읽기·수정은 절대 안 된다.
drop policy if exists "guest can create booking" on public.bookings;
create policy "guest can create booking"
  on public.bookings for insert
  to anon
  with check (
    customer is null
    and coalesce(btrim(guest_name),'')    <> ''
    and coalesce(btrim(guest_contact),'') <> ''
  );

grant insert on public.bookings to anon;

-- 디자이너는 자기에게 온 비회원 예약을 볼 수 있어야 한다.
-- (기존 정책이 customer = auth.uid() 만 보도록 돼 있으면 비회원 예약이 안 보인다)
drop policy if exists "designer reads own bookings" on public.bookings;
create policy "designer reads own bookings"
  on public.bookings for select
  to authenticated
  using (designer = auth.uid() or customer = auth.uid());

drop policy if exists "designer updates own bookings" on public.bookings;
create policy "designer updates own bookings"
  on public.bookings for update
  to authenticated
  using (designer = auth.uid() or customer = auth.uid())
  with check (designer = auth.uid() or customer = auth.uid());

commit;

-- ── 확인 ──────────────────────────────────────────────────────
-- 아래가 3줄 나오면 정상이다.
select column_name, is_nullable
  from information_schema.columns
 where table_name = 'bookings'
   and column_name in ('customer','guest_name','guest_contact')
 order by column_name;
