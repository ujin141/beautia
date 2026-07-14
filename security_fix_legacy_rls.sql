-- ============================================================
-- 보안 교정 #4 — Supabase advisor 대응 (CRITICAL x2, 2026-07-15)
--   ① rls_disabled_in_public: RLS 꺼진 public 테이블 = 누구나 읽기·수정·삭제
--   ② auth_users_exposed: auth.users 를 노출하는 뷰가 API로 공개
--  근거(실 DB 확인): 아래 12개 테이블은 옛 포럼/샵 백엔드 잔재로 RLS 미적용 →
--   anon 키로 INSERT 성공(42501 아님) 확인. 뷰 5개(v_*)도 anon 접근 가능(하나가 phone/auth.users 노출).
--   ※ 현재 Beautia 코드는 이 테이블/뷰를 사용하지 않음(designer_reviews·designer_applications·
--     conversations·messages·profiles 사용). reviews 는 dashboard try/catch 폴백, applications 는
--     폐기된 community_admin.html 용 → 잠가도 정상 동작.
--  방침: 레거시 테이블 RLS 켜서 deny-default(정책 없음=완전 잠금) + 레거시 뷰 anon/authenticated 접근 회수.
--  멱등(여러 번 실행 안전).
-- ============================================================

-- ① RLS 활성화 (정책 없음 = 모든 anon/authenticated 접근 차단, service_role 만 접근)
alter table if exists public.shops              enable row level security;
alter table if exists public.shop_menus         enable row level security;
alter table if exists public.chat_rooms         enable row level security;
alter table if exists public.chat_messages      enable row level security;
alter table if exists public.community_posts    enable row level security;
alter table if exists public.community_comments enable row level security;
alter table if exists public.reviews            enable row level security;
alter table if exists public.categories         enable row level security;
alter table if exists public.applications       enable row level security;
alter table if exists public.user_rewards       enable row level security;
alter table if exists public.exchange_rates     enable row level security;
alter table if exists public.system_settings    enable row level security;

-- ② auth.users / 개인정보 노출 뷰: API 접근(anon·authenticated) 회수
--    (뷰 자체는 남겨두되 공개 API 노출만 제거 → 되돌리기 쉬움. 완전 정리를 원하면 drop view 로 교체)
revoke all on table public.v_shop_detail_full          from anon, authenticated;
revoke all on table public.v_home_master               from anon, authenticated;
revoke all on table public.v_home_smart_price_reviews  from anon, authenticated;
revoke all on table public.v_user_home_reward          from anon, authenticated;
revoke all on table public.v_chat_list                 from anon, authenticated;

-- 완료 후 Supabase Advisor 재실행 시 두 경고 모두 해제되어야 함.
-- 만약 특정 뷰를 실제로 쓰는 다른 시스템이 있다면 revoke 대신 security_invoker=on + RLS 로 재설계할 것.
