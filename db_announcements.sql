-- Beautia · 공지(전체 알림) 테이블. Supabase → SQL Editor 에 1회 실행.
-- 어드민 "공지" 탭에서 작성 → 모든 사용자의 알림(🔔) 피드에 표시됩니다.

create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title      text not null,
  body       text,
  active     boolean not null default true
);
create index if not exists announcements_active_idx on public.announcements (active, created_at desc);

alter table public.announcements enable row level security;

-- 활성 공지: 누구나 조회(전체 사용자에게 노출)
drop policy if exists ann_public_select on public.announcements;
create policy ann_public_select on public.announcements
  for select to anon, authenticated using (active = true);

-- 오너: 전체 조회(비활성 포함) + 작성 + 수정
drop policy if exists ann_owner_select on public.announcements;
create policy ann_owner_select on public.announcements
  for select to authenticated using ((auth.jwt() ->> 'email') = 'ujin141@naver.com');
drop policy if exists ann_owner_insert on public.announcements;
create policy ann_owner_insert on public.announcements
  for insert to authenticated with check ((auth.jwt() ->> 'email') = 'ujin141@naver.com');
drop policy if exists ann_owner_update on public.announcements;
create policy ann_owner_update on public.announcements
  for update to authenticated using ((auth.jwt() ->> 'email') = 'ujin141@naver.com');
