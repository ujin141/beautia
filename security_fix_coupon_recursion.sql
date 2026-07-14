-- ============================================================
-- 보안/기능 교정 #3 — 쿠폰 RLS 무한재귀(42P17) 해소 (HIGH · 기능 전체 먹통)
--  근거(실 DB 확인 2026-07-15):
--   · coupons_select 가 user_coupons 를 서브쿼리로 참조,
--     user_coupons.uc_select 가 다시 coupons 를 서브쿼리로 참조 → 상호 RLS 재귀
--   · 결과: coupons/user_coupons 어떤 SELECT 도 "infinite recursion detected in policy"(500)
--     → 로그인 유저 포함 쿠폰 조회·등록·목록 전부 실패(쿠폰 기능 완전 마비)
--  방침:
--   · 교차 참조를 SECURITY DEFINER 헬퍼 함수로 감싸 내부 조회가 상대 테이블의 RLS 를
--     다시 트리거하지 않게 함(재귀 차단). 접근 규칙 자체는 기존과 동일하게 유지.
--  멱등(여러 번 실행 안전). 정상 흐름 미영향.
-- ============================================================

-- 헬퍼: 내가 이 쿠폰을 보유 중인가 (user_coupons 조회, RLS 우회)
create or replace function public.user_holds_coupon(p_coupon uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.user_coupons uc
    where uc.coupon = p_coupon and uc.holder = auth.uid()
  );
$$;

-- 헬퍼: 내가 이 쿠폰의 발행자인가 (coupons 조회, RLS 우회)
create or replace function public.user_issues_coupon(p_coupon uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.coupons c
    where c.id = p_coupon and c.issuer = auth.uid()
  );
$$;

grant execute on function public.user_holds_coupon(uuid)  to anon, authenticated;
grant execute on function public.user_issues_coupon(uuid) to anon, authenticated;

-- coupons SELECT: 발행자 / 어드민 / 보유자(헬퍼로 참조 — 재귀 없음)
drop policy if exists coupons_select on public.coupons;
create policy coupons_select on public.coupons for select
  using (
    issuer = auth.uid()
    or public.is_admin()
    or public.user_holds_coupon(coupons.id)
  );

-- user_coupons SELECT: 보유자 / 어드민 / 발행자(헬퍼로 참조 — 재귀 없음)
drop policy if exists uc_select on public.user_coupons;
create policy uc_select on public.user_coupons for select
  using (
    holder = auth.uid()
    or public.is_admin()
    or public.user_issues_coupon(user_coupons.coupon)
  );
