-- Beautia 콘텐츠 모더레이션 (App Store 심사 1.2 — 신고/차단)
-- Supabase SQL 에디터에서 1회 실행.

-- 1) 신고 접수
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter     uuid not null references auth.users(id) on delete cascade,
  target_type  text not null,          -- designer | review | message | work
  target_id    text not null,          -- 대상 식별자(디자이너 uid 등)
  reason       text not null,          -- spam | abuse | nudity | fake | copyright | other
  detail       text,                   -- 참고 라벨/메모
  status       text not null default 'open',  -- open | reviewed | actioned
  created_at   timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports(status);
alter table public.reports enable row level security;
-- 신고는 로그인 사용자가 등록만(중복 방지는 앱단), 조회/처리는 service_role(운영)만
drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports
  for insert with check (auth.uid() = reporter);

-- 2) 사용자 차단
create table if not exists public.user_blocks (
  blocker     uuid not null references auth.users(id) on delete cascade,
  blocked     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker, blocked)
);
create index if not exists user_blocks_blocker_idx on public.user_blocks(blocker);
alter table public.user_blocks enable row level security;
drop policy if exists user_blocks_select_own on public.user_blocks;
create policy user_blocks_select_own on public.user_blocks
  for select using (auth.uid() = blocker);
drop policy if exists user_blocks_insert_own on public.user_blocks;
create policy user_blocks_insert_own on public.user_blocks
  for insert with check (auth.uid() = blocker);
drop policy if exists user_blocks_delete_own on public.user_blocks;
create policy user_blocks_delete_own on public.user_blocks
  for delete using (auth.uid() = blocker);
