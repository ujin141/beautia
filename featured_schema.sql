-- =====================================================================
-- Beautia · Featured (발견/크레딧) — Supabase SQL Editor 에 붙여넣고 Run
-- 원작자 인스타 크레딧으로 표시되는 큐레이션 항목. 오너만 추가/수정 가능, 공개 읽기.
-- 오너 = ujin141@naver.com (JWT 이메일로 판별)
-- =====================================================================

create table if not exists public.featured (
  id          uuid primary key default gen_random_uuid(),
  insta       text not null,               -- 원작자 인스타 핸들(크레딧, @ 없이)
  cat         text not null default 'Hair',-- Hair/Makeup/Nail/Lash/Skin/Bridal
  city        text,                          -- 도시(선택)
  area        text,                          -- 세부 지역(선택)
  imgs        jsonb not null default '[]',   -- 이미지 URL 배열
  created_at  timestamptz not null default now()
);
create index if not exists featured_created_idx on public.featured(created_at desc);

alter table public.featured enable row level security;

-- 공개 읽기(누구나 발견 카드 조회)
drop policy if exists featured_read on public.featured;
create policy featured_read on public.featured for select using (true);

-- 오너만 추가/수정/삭제
drop policy if exists featured_owner_write on public.featured;
create policy featured_owner_write on public.featured for all
  using  ((auth.jwt() ->> 'email') = 'ujin141@naver.com')
  with check ((auth.jwt() ->> 'email') = 'ujin141@naver.com');

-- 실시간: supabase_realtime 퍼블리케이션이 FOR ALL TABLES 라서 자동 포함(별도 add 시 55000 에러).
