-- ============================================================
-- Beautia — 방문 통계 서버 집계 (선택 · 성능용)
--
-- 왜 필요한가:
--   PostgREST 는 한 번에 기본 1000행까지만 돌려준다. 어드민 통계가 방문 행을
--   통째로 받아 브라우저에서 세고 있었기 때문에, 누적이 1000건을 넘는 순간
--   '이번 주 방문'과 7일 그래프가 조용히 적게 나왔다.
--   (2026-07-16 발견: '오늘 방문자' 249건 vs '이번 주 방문' 안의 오늘 225건)
--
--   코드는 이미 '1000행씩 끝까지 받아오기' 폴백으로 고쳐서 이 SQL 없이도 정확하다.
--   다만 방문이 수만 건이 되면 그만큼 브라우저로 실어 나르게 되므로,
--   이 함수를 만들어두면 DB가 세서 며칠치 숫자만 돌려준다(1쿼리).
--
-- 실행하지 않아도 사이트는 정상 동작한다(폴백). 언제 실행해도 안전.
-- ============================================================

-- 관리자용 — 전체 사이트 일자별 방문
-- SECURITY DEFINER 이므로 함수 안에서 관리자인지 반드시 확인한다.
-- (is_platform_admin() 은 email + aal2(2단계 인증)를 요구 — db_mfa_enforce.sql 참고)
create or replace function public.visits_daily(p_since date)
returns table(d date, n bigint)
language sql stable security definer set search_path = public as $$
  select v.day, count(*)
    from public.page_visits v
   where v.day >= p_since
     and public.is_platform_admin()
   group by v.day
   order by v.day
$$;

revoke all on function public.visits_daily(date) from public;
grant execute on function public.visits_daily(date) to authenticated;


-- ── 확인 ────────────────────────────────────────────────────
-- 관리자로 로그인한 세션에서 실행하면 일자별 숫자가, 아니면 0행이 나온다.
select * from public.visits_daily((now() at time zone 'Asia/Seoul')::date - 13);

-- 정확성 대조: 아래 두 숫자가 같아야 한다.
select count(*) as 오늘_정확
  from public.page_visits
 where day = (now() at time zone 'Asia/Seoul')::date;
