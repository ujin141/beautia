-- Beautia · 방문자 통계용 테이블 (어드민: 총 방문 / 오늘 방문자)
-- Supabase → SQL Editor 에 붙여넣고 1회 실행하세요.

create table if not exists public.page_visits (
  id         bigint generated always as identity primary key,
  visitor    text,                                   -- 기기별 익명 ID (개인정보 아님)
  path       text,
  day        date not null default ((now() at time zone 'Asia/Seoul')::date),
  created_at timestamptz not null default now()
);
create index if not exists page_visits_day_idx on public.page_visits (day);

alter table public.page_visits enable row level security;

-- 방문 기록: anon 은 삽입만 (조회/수정/삭제 불가)
drop policy if exists pv_anon_insert on public.page_visits;
create policy pv_anon_insert on public.page_visits
  for insert to anon with check (true);

-- 집계 조회: 오너(로그인)만 허용
drop policy if exists pv_owner_select on public.page_visits;
create policy pv_owner_select on public.page_visits
  for select to authenticated
  using ((auth.jwt() ->> 'email') = 'ujin141@naver.com');
