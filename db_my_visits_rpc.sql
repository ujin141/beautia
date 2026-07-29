-- ============================================================
-- Beautia · 디자이너 '성과 인사이트' 켜기 — my_visits_daily
--
-- 증상: 대시보드 홈 → '성과·인사이트 더보기' 를 펼치면
--       이번 주 조회 / 조회→예약 / 최근 7일 추이가 전부 '—' 로 나온다.
--
-- 원인: 대시보드는 SB.rpc('my_visits_daily', {p_since}) 를 부르는데
--       DB 에 그 함수가 없다. 만들어진 적이 없다.
--       (db_visits_rpc.sql 의 visits_daily 는 '사이트 전체 · 관리자 전용'
--        이라 용도가 다르다. 디자이너 본인 조회수를 세는 함수가 따로 필요하다.)
--
--       대시보드는 함수가 없을 때 가짜 0 을 보여주지 않고 '—' + 준비중 안내를
--       띄우도록 이미 짜여 있다. 그래서 잘못된 숫자를 본 적은 없다.
--
-- 왜 designer_clicks 인가:
--   page_visits 는 사이트 전체 방문(경로 단위)이라 '누구의 프로필을 봤는지'가 없다.
--   designer_clicks 가 디자이너별 · 기기별 · 하루 1회로 이미 쌓이고 있고,
--   본인이 자기 프로필을 연 것은 클라이언트에서 제외한다.
--
-- 보안: SECURITY DEFINER 이지만 auth.uid() 로 본인 행만 센다.
--       남의 조회수는 어떤 경우에도 나오지 않는다.
--
-- Supabase → SQL Editor 에서 실행. 여러 번 실행해도 안전.
-- ============================================================

create or replace function public.my_visits_daily(p_since date)
returns table(d date, n bigint)
language sql
stable
security definer
set search_path = public
as $$
  select c.day, count(*)::bigint
    from public.designer_clicks c
   where c.designer = auth.uid()
     and c.day >= p_since
   group by c.day
   order by c.day
$$;

comment on function public.my_visits_daily(date) is
  '로그인한 디자이너 본인의 일자별 프로필 조회수. 대시보드 성과 인사이트용.';

-- 로그인한 사용자만. 익명에게는 주지 않는다(본인 것만 나오지만 호출 자체를 막는다).
revoke all on function public.my_visits_daily(date) from public;
revoke all on function public.my_visits_daily(date) from anon;
grant execute on function public.my_visits_daily(date) to authenticated;

-- ── 진단용으로 넣었던 시험 행 정리 ──────────────────────────
delete from public.page_visits     where visitor = '__diagnostic__';
delete from public.designer_clicks where visitor = '__diagnostic__';

-- ── 확인 ────────────────────────────────────────────────────
-- 디자이너로 로그인한 세션에서 실행하면 본인 일자별 조회수가 나온다.
select * from public.my_visits_daily((now() at time zone 'Asia/Seoul')::date - 13);
