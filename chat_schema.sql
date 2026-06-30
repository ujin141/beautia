-- =====================================================================
-- Beautia 채팅(메시징) — Supabase SQL Editor 에 통째로 붙여넣고 Run
-- 1:1 고객↔디자이너 대화 + 메시지 + RLS + 실시간
-- =====================================================================

-- 대화방
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  customer    uuid not null references auth.users(id) on delete cascade,
  designer    uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  last_at     timestamptz not null default now(),
  unique (customer, designer)
);

-- 메시지
create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  conversation  uuid not null references public.conversations(id) on delete cascade,
  sender        uuid not null references auth.users(id) on delete cascade,
  body          text not null,
  lang          text,                       -- 보낸 사람 언어 (ko/en/ja)
  tr            jsonb not null default '{}', -- 캐시된 번역 {ko:..,en:..,ja:..}
  created_at    timestamptz not null default now()
);
create index if not exists messages_conv_idx on public.messages(conversation, created_at);

-- RLS
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;

drop policy if exists conv_select on public.conversations;
create policy conv_select on public.conversations for select
  using (auth.uid() = customer or auth.uid() = designer);

drop policy if exists conv_insert on public.conversations;
create policy conv_insert on public.conversations for insert
  with check (auth.uid() = customer);

drop policy if exists conv_update on public.conversations;
create policy conv_update on public.conversations for update
  using (auth.uid() = customer or auth.uid() = designer);

drop policy if exists msg_select on public.messages;
create policy msg_select on public.messages for select
  using (exists (select 1 from public.conversations c
                 where c.id = conversation and (auth.uid() = c.customer or auth.uid() = c.designer)));

drop policy if exists msg_insert on public.messages;
create policy msg_insert on public.messages for insert
  with check (auth.uid() = sender and exists (
    select 1 from public.conversations c
    where c.id = conversation and (auth.uid() = c.customer or auth.uid() = c.designer)));

-- 참가자는 번역 캐시(tr)만 채울 수 있게 update 허용(상대 메시지 tr 갱신용)
drop policy if exists msg_update on public.messages;
create policy msg_update on public.messages for update
  using (exists (select 1 from public.conversations c
                 where c.id = conversation and (auth.uid() = c.customer or auth.uid() = c.designer)));

-- 실시간(Realtime): supabase_realtime 퍼블리케이션이 FOR ALL TABLES 라서
-- 새 테이블도 자동 포함됨 → 별도 add 불필요(추가하면 55000 에러).

-- =====================================================================
-- 저장(♡) — 계정별 동기화 (기기/로그인 간 유지)
-- =====================================================================
create table if not exists public.saves (
  user_id    uuid not null references auth.users(id) on delete cascade,
  wid        text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, wid)
);
alter table public.saves enable row level security;
drop policy if exists saves_all on public.saves;
create policy saves_all on public.saves for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
