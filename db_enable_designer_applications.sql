-- Beautia · 디자이너 등록 신청 → 오너 승인 — Supabase SQL Editor에서 1회 실행
-- 로그인한 유저가 디자이너 등록을 신청하면 저장되고, 오너(/admin)가 승인하면
-- 해당 유저 프로필이 디자이너로 전환됩니다. RLS로 안전(본인 신청만 작성, 오너만 승인).
-- 여러 번 실행해도 안전.

create table if not exists public.designer_applications (
  id         uuid primary key default gen_random_uuid(),
  uid        uuid not null references auth.users(id) on delete cascade,
  name       text,
  shop_name  text,
  region     text,
  area       text,
  specialty  text,      -- 'Hair' | 'Lash' | ... (canonical)
  insta      text,
  career     text,
  contact    text,
  message    text,
  photos     jsonb not null default '[]',
  status     text not null default 'pending',   -- pending | approved | rejected
  created_at timestamptz not null default now()
);
create index if not exists da_status_idx on public.designer_applications(status);
create index if not exists da_uid_idx on public.designer_applications(uid);

grant select, insert, update on public.designer_applications to authenticated;

alter table public.designer_applications enable row level security;

-- 신청자: 본인 것만 작성 + 조회
drop policy if exists "da_self_insert" on public.designer_applications;
create policy "da_self_insert" on public.designer_applications
  for insert to authenticated with check (auth.uid() = uid);

drop policy if exists "da_self_read" on public.designer_applications;
create policy "da_self_read" on public.designer_applications
  for select to authenticated using (auth.uid() = uid);

-- 오너: 전체 조회 + 승인/거절(업데이트)
drop policy if exists "da_owner_all" on public.designer_applications;
create policy "da_owner_all" on public.designer_applications
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'ujin141@naver.com')
  with check ((auth.jwt() ->> 'email') = 'ujin141@naver.com');
