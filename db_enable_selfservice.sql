-- Beautia · 디자이너 셀프서비스(대시보드) 활성화 SQL — Supabase SQL Editor에서 1회 실행
-- 로그인한 디자이너가 (1) 본인 프로필 저장 (2) 본인 폴더에 사진 업로드 할 수 있게 권한+RLS 설정.
-- 여러 번 실행해도 안전. 공개 조회는 유지.

-- ============ profiles ============
grant select on public.profiles to anon;
grant select, insert, update on public.profiles to authenticated;

alter table public.profiles enable row level security;

drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read" on public.profiles
  for select using (true);

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ============ storage: 'beautia' 버킷 ============
-- 사전조건: Storage → beautia 버킷을 Public 으로 설정(이미지 공개 표시용).
-- 정책: 누구나 읽기 / 본인 uid 폴더에만 쓰기·수정·삭제(name 이 '<uid>/...' 형태).

drop policy if exists "beautia_public_read" on storage.objects;
create policy "beautia_public_read" on storage.objects
  for select using (bucket_id = 'beautia');

drop policy if exists "beautia_own_insert" on storage.objects;
create policy "beautia_own_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'beautia' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "beautia_own_update" on storage.objects;
create policy "beautia_own_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'beautia' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "beautia_own_delete" on storage.objects;
create policy "beautia_own_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'beautia' and (storage.foldername(name))[1] = auth.uid()::text);
