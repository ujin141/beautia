-- Beautia · 오너 어드민(/admin) 활성화 SQL — Supabase SQL Editor에서 1회 실행
-- 오너 이메일(ujin141@naver.com) 로그인 시에만 전 디자이너 편집/사진관리가 가능하도록 RLS 추가.
-- service_role 키를 웹에 넣지 않고, DB 레벨에서 오너만 허용 → 안전.
-- 전부 "추가형(additive)"이라 여러 번 실행해도 안전하고, 기존 앱 동작(공개조회/셀프수정)은 유지됩니다.
-- 사전조건: db_enable_selfservice.sql 을 먼저 실행(디자이너 셀프서비스 RLS)했다고 가정.

-- ===== profiles: 오너는 모든 디자이너 프로필 편집 가능 =====
-- (profiles 는 이미 RLS 활성 + 공개조회/셀프수정 정책이 있다고 가정. 아래는 오너 전용 정책 추가)
drop policy if exists "profiles_owner_all" on public.profiles;
create policy "profiles_owner_all" on public.profiles
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'ujin141@naver.com')
  with check ((auth.jwt() ->> 'email') = 'ujin141@naver.com');

-- ===== storage: 오너는 beautia 버킷의 어떤 디자이너 폴더에도 업로드 가능 =====
drop policy if exists "beautia_owner_all" on storage.objects;
create policy "beautia_owner_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'beautia' and (auth.jwt() ->> 'email') = 'ujin141@naver.com')
  with check (bucket_id = 'beautia' and (auth.jwt() ->> 'email') = 'ujin141@naver.com');

-- ===== bookings / designer_reviews: 오너 조회(운영 개요) =====
-- 주의: 아래는 SELECT 권한만 부여 + 오너 SELECT 정책만 추가합니다.
-- 이 테이블들의 RLS 를 여기서 강제로 켜지 않으므로(alter enable 없음),
-- 기존 앱의 예약/후기 기능이 절대 끊기지 않습니다. (RLS 가 이미 켜져 있으면 오너 정책이 조회를 허용)
grant select on public.bookings to authenticated;
grant select on public.designer_reviews to authenticated;

drop policy if exists "bookings_owner_read" on public.bookings;
create policy "bookings_owner_read" on public.bookings
  for select to authenticated
  using ((auth.jwt() ->> 'email') = 'ujin141@naver.com');

drop policy if exists "reviews_owner_read" on public.designer_reviews;
create policy "reviews_owner_read" on public.designer_reviews
  for select to authenticated
  using ((auth.jwt() ->> 'email') = 'ujin141@naver.com');

-- ===== 오너: 후기 삭제(모더레이션) — 스팸/악성 후기 제거 =====
grant delete on public.designer_reviews to authenticated;
drop policy if exists "reviews_owner_delete" on public.designer_reviews;
create policy "reviews_owner_delete" on public.designer_reviews
  for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'ujin141@naver.com');
