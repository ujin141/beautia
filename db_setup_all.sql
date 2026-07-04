-- ============================================================
-- Beautia · 전체 권한 설정 (한 번만 실행) — Supabase → SQL Editor → 붙여넣기 → Run
-- 이거 하나면: 프로필 저장 / 사진 업로드 / 오너 어드민 편집·승인 / 팔로우 / 디자이너 신청
-- 이 전부 실제로 저장됩니다. 여러 번 실행해도 안전.
-- 사전조건: Storage → 'beautia' 버킷을 Public 으로 설정.
-- ============================================================

-- ========== 1) profiles: 공개 조회 + 본인 수정 + 오너 전체 관리 ==========
grant select on public.profiles to anon;
grant select, insert, update on public.profiles to authenticated;
alter table public.profiles enable row level security;

drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read" on public.profiles for select using (true);

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- 오너(관리자)는 모든 프로필 편집/승인 가능
drop policy if exists "profiles_owner_all" on public.profiles;
create policy "profiles_owner_all" on public.profiles
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'ujin141@naver.com')
  with check ((auth.jwt() ->> 'email') = 'ujin141@naver.com');

-- ========== 2) storage 'beautia' 버킷: 공개 읽기 + 본인 폴더 쓰기 + 오너 전체 ==========
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

drop policy if exists "beautia_owner_all" on storage.objects;
create policy "beautia_owner_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'beautia' and (auth.jwt() ->> 'email') = 'ujin141@naver.com')
  with check (bucket_id = 'beautia' and (auth.jwt() ->> 'email') = 'ujin141@naver.com');

-- ========== 3) bookings / designer_reviews: 오너 조회 ==========
grant select on public.bookings to authenticated;
grant select on public.designer_reviews to authenticated;

drop policy if exists "bookings_owner_read" on public.bookings;
create policy "bookings_owner_read" on public.bookings
  for select to authenticated using ((auth.jwt() ->> 'email') = 'ujin141@naver.com');

drop policy if exists "reviews_owner_read" on public.designer_reviews;
create policy "reviews_owner_read" on public.designer_reviews
  for select to authenticated using ((auth.jwt() ->> 'email') = 'ujin141@naver.com');

-- ========== 4) follows: 디자이너 팔로우 ==========
create table if not exists public.follows (
  follower   uuid not null references auth.users(id) on delete cascade,
  designer   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, designer)
);
create index if not exists follows_designer_idx on public.follows(designer);
grant select on public.follows to anon, authenticated;
grant insert, delete on public.follows to authenticated;
alter table public.follows enable row level security;

drop policy if exists "follows_public_read" on public.follows;
create policy "follows_public_read" on public.follows for select using (true);
drop policy if exists "follows_self_insert" on public.follows;
create policy "follows_self_insert" on public.follows for insert to authenticated with check (auth.uid() = follower);
drop policy if exists "follows_self_delete" on public.follows;
create policy "follows_self_delete" on public.follows for delete to authenticated using (auth.uid() = follower);

-- ========== 5) designer_applications: 디자이너 등록 신청 → 오너 승인 ==========
create table if not exists public.designer_applications (
  id         uuid primary key default gen_random_uuid(),
  uid        uuid not null references auth.users(id) on delete cascade,
  name       text, shop_name text, region text, area text, specialty text,
  insta text, career text, contact text, message text,
  photos     jsonb not null default '[]',
  status     text not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists da_status_idx on public.designer_applications(status);
create index if not exists da_uid_idx on public.designer_applications(uid);
grant select, insert, update on public.designer_applications to authenticated;
alter table public.designer_applications enable row level security;

drop policy if exists "da_self_insert" on public.designer_applications;
create policy "da_self_insert" on public.designer_applications for insert to authenticated with check (auth.uid() = uid);
drop policy if exists "da_self_read" on public.designer_applications;
create policy "da_self_read" on public.designer_applications for select to authenticated using (auth.uid() = uid);
drop policy if exists "da_owner_all" on public.designer_applications;
create policy "da_owner_all" on public.designer_applications
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'ujin141@naver.com')
  with check ((auth.jwt() ->> 'email') = 'ujin141@naver.com');

-- ========== 6) 예약 시간 중복 방지 ==========
-- 손님이 다른 손님의 예약 정보는 못 보고, 특정 디자이너·날짜의 '이미 잡힌 시간'만 조회 (프라이버시 보호).
-- 앱 예약 화면에서 이미 예약된 시간은 선택 못 하게 막는 데 사용.
create or replace function public.booked_times(p_designer uuid, p_date text)
returns setof text
language sql
security definer
stable
as $$
  select time from public.bookings
  where designer = p_designer
    and date::text = p_date
    and coalesce(status,'pending') not in ('declined','cancelled')
    and time is not null and time <> '';
$$;
grant execute on function public.booked_times(uuid, text) to anon, authenticated;

-- 완료! 이제 어드민 편집/승인, 프로필 저장, 팔로우, 신청, 예약 중복 방지가 모두 동작합니다.
