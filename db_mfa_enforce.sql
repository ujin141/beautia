-- ============================================================
-- Beautia — 관리자 2단계 인증(MFA)을 DB 레벨에서 강제
--
-- 왜 필요한가:
--   지금까지 MFA 검사는 admin.html 화면(enforceMFA)에서만 했다.
--   DB의 is_platform_admin() 은 JWT의 email 만 봤기 때문에,
--   비밀번호를 아는 사람이 우리 화면을 건너뛰고 REST API를 직접 호출하면
--   6자리 코드 없이 관리자 권한을 그대로 얻었다. (현관문만 잠그고 창문은 열린 상태)
--
--   여기서 aal 클레임을 함께 요구하면 "인증 앱 코드를 통과한 세션"만
--   관리자 우회 권한을 갖는다. 화면을 건너뛰어도 DB가 막는다.
--     aal1 = 비밀번호만 통과 / aal2 = 2단계 인증까지 통과
--
-- 락아웃 걱정 없음 (폰을 잃어버려도 복구 가능):
--   이 SQL Editor 자체가 탈출구다. Supabase 대시보드 로그인은 우리 앱의 MFA와
--   완전히 별개이므로, 폰이 없어도 여기 들어와서 맨 아래 [복구] 쿼리를 돌리면
--   MFA가 초기화되고 다음 /admin 로그인 때 QR이 새로 뜬다.
--   (탈출구를 로컬 키 파일이 아니라 Supabase 계정 뒤에 두는 편이 더 안전하다.)
--
-- Supabase SQL Editor 에서 실행. 여러 번 실행해도 안전(idempotent).
-- ============================================================

create or replace function public.is_platform_admin()
returns boolean language sql stable set search_path = public as $$
  select coalesce(auth.jwt() ->> 'email','') = 'ujin141@naver.com'
     and coalesce(auth.jwt() ->> 'aal','')   = 'aal2'
$$;

-- ── 확인 ────────────────────────────────────────────────────
-- 1) 함수 정의에 aal2 조건이 들어갔는지
select case when pg_get_functiondef('public.is_platform_admin()'::regprocedure) like '%aal2%'
            then 'OK — 관리자 권한에 2단계 인증 필요'
            else '실패 — aal2 조건 없음' end as mfa_enforcement;

-- 2) 관리자 계정에 MFA 팩터가 실제로 등록돼 있는지 (없으면 관리자 권한을 못 얻는다!)
--    반드시 verified 가 1개 이상이어야 한다. 0 이면 위 함수를 되돌리고 먼저 등록할 것.
select u.email, count(f.id) filter (where f.status = 'verified') as verified_factors
  from auth.users u
  left join auth.mfa_factors f on f.user_id = u.id
 where u.email = 'ujin141@naver.com'
 group by u.email;


-- ============================================================
-- [복구] 폰/인증 앱을 잃어버려 /admin 에 6자리 코드를 넣을 수 없을 때
--
-- 아래 두 줄의 주석(--)을 풀고 여기 SQL Editor 에서 실행하면 MFA가 초기화된다.
-- 그 다음 /admin 에 로그인하면 어드민이 QR을 새로 띄워준다. 새 폰으로 스캔하면 끝.
--
-- 실행 후 반드시:
--   1) 새 QR을 스캔하고
--   2) 이번엔 화면의 "수동 키"도 비번 관리자(1Password/Bitwarden 등)에 같이 저장할 것
--      → 폰이 또 죽어도 두 번째 기기에서 코드를 만들 수 있다.
--
-- delete from auth.mfa_factors
--  where user_id = (select id from auth.users where email = 'ujin141@naver.com');
-- ============================================================
