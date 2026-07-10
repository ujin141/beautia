-- Beautia 푸시 알림 토큰 저장 (네이티브 앱 → APNs/FCM 발송용)
-- Supabase SQL 에디터에서 1회 실행. 발송은 service_role 서버에서 이 토큰으로 전송.

create table if not exists public.push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  token       text not null unique,          -- 디바이스 푸시 토큰(APNs/FCM). upsert onConflict=token
  platform    text not null default 'ios',   -- ios | android
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists push_tokens_user_idx on public.push_tokens(user_id);

alter table public.push_tokens enable row level security;

-- 본인 토큰만 등록/수정/삭제/조회 (service_role은 RLS 우회 → 발송 서버가 전체 조회 가능)
drop policy if exists push_tokens_select_own on public.push_tokens;
create policy push_tokens_select_own on public.push_tokens
  for select using (auth.uid() = user_id);

drop policy if exists push_tokens_insert_own on public.push_tokens;
create policy push_tokens_insert_own on public.push_tokens
  for insert with check (auth.uid() = user_id);

drop policy if exists push_tokens_update_own on public.push_tokens;
create policy push_tokens_update_own on public.push_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists push_tokens_delete_own on public.push_tokens;
create policy push_tokens_delete_own on public.push_tokens
  for delete using (auth.uid() = user_id);
