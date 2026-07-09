-- Beautia · 어드민 접속 기록(IP 로그). Supabase → SQL Editor 에 1회 실행.
-- 어드민 로그인 시 IP·도시·기기·시각을 기록. "접속기록" 탭에서 오너만 조회.

create table if not exists public.admin_access_log (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email      text,
  ip         text,
  city       text,
  country    text,
  ua         text,
  result     text   -- owner / denied
);
create index if not exists aal_created_idx on public.admin_access_log (created_at desc);

alter table public.admin_access_log enable row level security;

-- 기록(insert): 로그인한 사용자만 (anon 스팸 방지) · 길이 제한
-- ⚠️ email은 반드시 본인 JWT 이메일과 일치해야 함(오너 사칭·로그 위조 차단):
--   이 강제가 없으면 일반 유저가 email='오너', result='owner', 가짜IP 행을 삽입해 감사로그를 오염시킬 수 있음.
drop policy if exists aal_insert on public.admin_access_log;
create policy aal_insert on public.admin_access_log
  for insert to authenticated
  with check (
    lower(email) = lower(auth.jwt() ->> 'email')   -- 클라가 소문자화해 보내므로 양쪽 lower로 비교
    and char_length(coalesce(ip,'')) <= 64
    and char_length(coalesce(ua,'')) <= 400
    and char_length(coalesce(email,'')) <= 120
  );

-- 조회(select): 오너만
drop policy if exists aal_owner_select on public.admin_access_log;
create policy aal_owner_select on public.admin_access_log
  for select to authenticated
  using ((auth.jwt() ->> 'email') = 'ujin141@naver.com');
