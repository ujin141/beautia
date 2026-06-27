-- 포인트·친구초대 "진짜 작동"용 SQL (Supabase SQL Editor에서 1회 실행)
-- 기존엔 localStorage뿐이라 로그아웃 시 사라지고 초대 적립도 안 됐음 → DB로 전환

-- 1) 프로필에 포인트·초대코드 컬럼
alter table public.profiles add column if not exists points    integer default 0;
alter table public.profiles add column if not exists ref_code  text;

-- 2) 적립 원장(ledger): 모든 적립 기록 + 중복 방지
create table if not exists public.point_ledger (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users(id) on delete cascade,
  akey       text,                 -- 중복 방지 키(가입/초대/글 등). null이면 매번 적립(댓글 등)
  amount     integer not null,
  reason     text,
  created_at timestamptz default now()
);
-- 같은 (유저, akey) 중복 적립 금지 (akey 있는 경우만)
create unique index if not exists point_ledger_user_akey
  on public.point_ledger(user_id, akey) where akey is not null;

alter table public.point_ledger enable row level security;
drop policy if exists point_ledger_read on public.point_ledger;
create policy point_ledger_read on public.point_ledger for select
  using (auth.uid() = user_id or public.is_admin());
drop policy if exists point_ledger_insert on public.point_ledger;
create policy point_ledger_insert on public.point_ledger for insert
  with check (auth.uid() = user_id);

-- 3) 적립되면 profiles.points 자동 합산
create or replace function public.sync_points()
returns trigger language plpgsql security definer set search_path = public as $sp$
begin
  update public.profiles set points = coalesce(points,0) + NEW.amount where id = NEW.user_id;
  return NEW;
end; $sp$;
drop trigger if exists trg_point_ledger on public.point_ledger;
create trigger trg_point_ledger after insert on public.point_ledger
  for each row execute function public.sync_points();

-- 4) 친구초대: 초대받은 사람이 호출 → 초대한 사람에게 3,000P 적립(1인당 1회)
create or replace function public.award_referral(inviter_code text)
returns void language plpgsql security definer set search_path = public as $ar$
declare inv uuid;
begin
  if inviter_code is null or inviter_code = '' then return; end if;
  select id into inv from public.profiles where ref_code = inviter_code limit 1;
  if inv is null or inv = auth.uid() then return; end if;
  insert into public.point_ledger(user_id, akey, amount, reason)
    values (inv, 'ref_from:'||auth.uid()::text, 3000, '친구 초대')
    on conflict do nothing;
end; $ar$;
grant execute on function public.award_referral(text) to authenticated;
