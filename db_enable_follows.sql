-- Beautia · 디자이너 팔로우 기능 — Supabase SQL Editor에서 1회 실행
-- 손님(로그인 유저)이 디자이너를 팔로우. 팔로우 안 해도 로컬 저장은 되지만,
-- 이 테이블이 있어야 기기 간 동기화 + 팔로워 수 집계가 됩니다. 여러 번 실행해도 안전.

create table if not exists public.follows (
  follower   uuid not null references auth.users(id) on delete cascade,
  designer   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, designer)
);

create index if not exists follows_designer_idx on public.follows(designer);

grant select on public.follows to anon, authenticated;   -- 팔로워 수 공개 집계용
grant insert, delete on public.follows to authenticated;  -- 본인 팔로우만 추가/삭제

alter table public.follows enable row level security;

drop policy if exists "follows_public_read" on public.follows;
create policy "follows_public_read" on public.follows
  for select using (true);

drop policy if exists "follows_self_insert" on public.follows;
create policy "follows_self_insert" on public.follows
  for insert to authenticated with check (auth.uid() = follower);

drop policy if exists "follows_self_delete" on public.follows;
create policy "follows_self_delete" on public.follows
  for delete to authenticated using (auth.uid() = follower);
