-- =====================================================================
-- Beautia COLLECTION · 보안 RLS/권한 패치
-- Supabase 대시보드 → SQL Editor 에 "통째로" 붙여넣고 Run
-- (idempotent: 여러 번 실행해도 안전)
-- =====================================================================

-- ---------------------------------------------------------------------
-- [라운드2] 권한 상승 차단: profiles 쓰기를 안전 컬럼으로만 제한
--   (is_admin·points·blocked·ref_code·email·phone 를 클라이언트가 못 쓰게)
-- ---------------------------------------------------------------------
REVOKE INSERT ON public.profiles FROM anon, authenticated;
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT INSERT (id, nickname, role, region, bio, interests, shop, full_name, avatar_url)
  ON public.profiles TO authenticated;
GRANT UPDATE (nickname, role, region, bio, interests, shop, full_name, avatar_url)
  ON public.profiles TO authenticated;

-- (선택) 미사용 포럼 테이블 쓰기 차단 — 스팸/오남용 방지
REVOKE INSERT, UPDATE, DELETE ON public.posts         FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.comments      FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.notifications FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- [라운드3] 입력 무결성: role 화이트리스트 + 길이 제한
--   (이상값·거대 payload 차단. 기존 row가 위반하면 ALTER 실패 →
--    select distinct role from profiles; 로 확인 후 목록 보완)
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_chk,
  ADD  CONSTRAINT profiles_role_chk CHECK (role IN ('designer','customer','owner','guest'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_len_chk,
  ADD  CONSTRAINT profiles_len_chk CHECK (
        char_length(coalesce(nickname,'')) <= 40
    AND char_length(coalesce(bio,''))      <= 2000
    AND char_length(coalesce(region,''))   <= 60
    AND char_length(coalesce(shop::text,'')) <= 200000
  );
-- ---------------------------------------------------------------------


-- ---------------------------------------------------------------------
-- 1) [가장 중요] 이메일·전화번호를 공개 API에서 숨김 (PII 유출 차단)
-- ---------------------------------------------------------------------
REVOKE SELECT (email, phone) ON public.profiles FROM anon, authenticated;

-- ---------------------------------------------------------------------
-- 2) profiles: 공개 읽기 OK, 쓰기는 "본인 행"만
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_public_read ON public.profiles;
CREATE POLICY profiles_public_read ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS profiles_own_insert ON public.profiles;
CREATE POLICY profiles_own_insert ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_own_update ON public.profiles;
CREATE POLICY profiles_own_update ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------
-- 3) 안 쓰는 구(舊) 포럼 테이블 공개 차단
--    (RLS만 켜고 정책을 안 주면 anon/authenticated는 기본 '차단')
-- ---------------------------------------------------------------------
ALTER TABLE IF EXISTS public.point_ledger  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.post_likes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.post_scraps   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 4) Storage(beautia 버킷): 본인 폴더({uid}/...)에만 업로드/수정/삭제,
--    읽기는 공개(포트폴리오 사진이 모두에게 보여야 하므로)
--    ※ 정책 표현식만 단독 실행하면 에러납니다 → 반드시 CREATE POLICY로.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS beautia_public_read ON storage.objects;
CREATE POLICY beautia_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'beautia');

DROP POLICY IF EXISTS beautia_own_insert ON storage.objects;
CREATE POLICY beautia_own_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'beautia' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS beautia_own_update ON storage.objects;
CREATE POLICY beautia_own_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'beautia' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS beautia_own_delete ON storage.objects;
CREATE POLICY beautia_own_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'beautia' AND (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- 끝. 적용 후 확인용 쿼리(선택):
--   select policyname, cmd from pg_policies where tablename='objects' and schemaname='storage';
--   select policyname, cmd from pg_policies where tablename='profiles';
-- =====================================================================
