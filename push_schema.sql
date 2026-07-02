-- =====================================================================
-- Beautia · 웹푸시 구독 저장 — SQL Editor 에 붙여넣고 Run
-- =====================================================================
create table if not exists public.push_subs (
  endpoint    text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  sub         jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists push_subs_user_idx on public.push_subs(user_id);

alter table public.push_subs enable row level security;

drop policy if exists push_own on public.push_subs;
create policy push_own on public.push_subs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
