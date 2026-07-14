-- Beautia · 디자이너 프로필 클릭(조회) 추적 — 인기 디자이너 순위용
-- Supabase → SQL Editor 에 붙여넣고 1회 실행. 여러 번 실행해도 안전.

create table if not exists public.designer_clicks (
  id         bigint generated always as identity primary key,
  designer   uuid not null,
  visitor    text,                                   -- 기기별 익명 ID (page_visits 와 동일)
  day        date not null default ((now() at time zone 'Asia/Seoul')::date),
  created_at timestamptz not null default now()
);
create index if not exists designer_clicks_d_idx on public.designer_clicks (designer, day);
-- 같은 기기가 같은 디자이너를 하루에 여러 번 열어도 1회만 (서버 레벨 dedup)
create unique index if not exists designer_clicks_dedup on public.designer_clicks (visitor, designer, day);

alter table public.designer_clicks enable row level security;

-- 기록: 누구나 삽입만 (조회·수정·삭제 불가)
drop policy if exists dc_insert on public.designer_clicks;
create policy dc_insert on public.designer_clicks
  for insert to anon, authenticated with check (true);

-- 원본 row 조회는 오너만
drop policy if exists dc_owner_read on public.designer_clicks;
create policy dc_owner_read on public.designer_clicks
  for select to authenticated
  using ((auth.jwt() ->> 'email') = 'ujin141@naver.com');

-- 공개 집계 RPC: 최근 N일 디자이너별 "고유 방문자" 클릭 수 (순위 계산용 · 개별 방문 정보는 비공개)
--  count(distinct visitor) 로 같은 기기 반복을 무력화(dedup index 와 이중 안전).
create or replace function public.designer_click_counts(p_days int default 30)
returns table(designer uuid, clicks bigint)
language sql security definer stable as $$
  select designer, count(distinct visitor)::bigint
  from public.designer_clicks
  where day >= ((now() at time zone 'Asia/Seoul')::date - p_days)
  group by designer;
$$;
grant execute on function public.designer_click_counts(int) to anon, authenticated;

-- 어뷰징 완화: 디자이너·일별 클릭 행 상한(대량 조작·행 폭주 차단).
--  anon 이 visitor 를 바꿔가며 무제한 삽입하는 것을 하루 300건으로 묶음(초기 규모 정상치보다 훨씬 큼).
--  ※ 완전한 클릭 무결성은 서버측 IP 기반 로깅이 필요 — 클릭 순위는 "소프트 신호"로 취급.
create or replace function public.dc_daily_cap()
returns trigger language plpgsql security definer set search_path = public as $$
declare cnt int;
begin
  select count(*) into cnt from public.designer_clicks
    where designer = new.designer and day = ((now() at time zone 'Asia/Seoul')::date);
  if cnt >= 300 then
    return null; -- 조용히 무시(에러 대신 무집계)
  end if;
  return new;
end;
$$;
drop trigger if exists dc_daily_cap_trg on public.designer_clicks;
create trigger dc_daily_cap_trg before insert on public.designer_clicks
  for each row execute function public.dc_daily_cap();
