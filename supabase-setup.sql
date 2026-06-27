-- ============================================================
--  Beautia 커뮤니티 + 어드민 전체 설정 SQL
--  실행: Supabase Dashboard → SQL Editor → New query → 아래 전체 붙여넣기 → Run
--  특징: 재실행해도 안전(idempotent). 기존 테이블/정책이 있어도 OK.
--  ※ 마지막 단계에서 본인 이메일로 관리자 지정하는 부분만 수정하세요.
-- ============================================================

-- 1) 확장
create extension if not exists pgcrypto;

-- 2) 테이블 (없으면 생성)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname   text,
  role       text default 'guest',     -- guest / owner / designer / official
  region     text default '전체',
  bio        text,
  interests  text[] default '{}',
  shop       jsonb  default '{}'::jsonb, -- avatar, photos[], name, area, services[], career, specialties[], situation, insta, shopDesc, hours, locDetail, koOK
  is_admin   boolean default false,
  blocked    boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  author     uuid references auth.users(id) on delete set null,
  nickname   text,
  cat        text default '자유',
  region     text default '전체',
  title      text,
  content    text,
  tags       text[]  default '{}',
  imgs       text[]  default '{}',      -- 이미지 base64 data URL
  pinned     boolean default false,
  hidden     boolean default false,
  like_count integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.comments (
  id         bigint generated always as identity primary key,
  post_id    uuid references public.posts(id) on delete cascade,
  author     uuid references auth.users(id) on delete set null,
  nickname   text,
  content    text,
  created_at timestamptz default now()
);

-- 3) 기존 테이블에 누락 컬럼 보강
alter table public.profiles add column if not exists is_admin   boolean default false;
alter table public.profiles add column if not exists blocked    boolean default false;
alter table public.profiles add column if not exists shop       jsonb  default '{}'::jsonb;
alter table public.profiles add column if not exists interests  text[] default '{}';
alter table public.profiles add column if not exists region     text   default '전체';
alter table public.profiles add column if not exists bio        text;
alter table public.posts    add column if not exists pinned     boolean default false;
alter table public.posts    add column if not exists hidden     boolean default false;
alter table public.posts    add column if not exists tags       text[] default '{}';
alter table public.posts    add column if not exists imgs       text[] default '{}';
alter table public.posts    add column if not exists like_count integer default 0;
alter table public.posts    add column if not exists nickname   text;

-- 4) 인덱스
create index if not exists posts_created_idx  on public.posts (created_at desc);
create index if not exists posts_region_idx   on public.posts (region);
create index if not exists posts_cat_idx      on public.posts (cat);
create index if not exists comments_post_idx  on public.comments (post_id);
create index if not exists profiles_role_idx  on public.profiles (role);

-- 5) 관리자 판별 함수 (RLS 무한재귀 방지를 위해 security definer)
create or replace function public.is_admin()
returns boolean language sql security definer stable
set search_path = public as $func$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$func$;
grant execute on function public.is_admin() to anon, authenticated;

-- 6) RLS 활성화
alter table public.profiles enable row level security;
alter table public.posts    enable row level security;
alter table public.comments enable row level security;

-- 7) 정책 (재실행 안전: drop 후 create)
-- ---- profiles ----
drop policy if exists profiles_read         on public.profiles;
create policy profiles_read         on public.profiles for select using (true);
drop policy if exists profiles_insert_self  on public.profiles;
create policy profiles_insert_self  on public.profiles for insert with check (auth.uid() = id);
drop policy if exists profiles_update_self  on public.profiles;
create policy profiles_update_self  on public.profiles for update using (auth.uid() = id);
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update using (public.is_admin());

-- ---- posts ----
drop policy if exists posts_read         on public.posts;
create policy posts_read         on public.posts for select using (true);
drop policy if exists posts_insert_auth  on public.posts;
create policy posts_insert_auth  on public.posts for insert with check (auth.uid() = author);
drop policy if exists posts_update_own   on public.posts;
create policy posts_update_own   on public.posts for update using (auth.uid() = author);
drop policy if exists posts_admin_update on public.posts;
create policy posts_admin_update on public.posts for update using (public.is_admin());
drop policy if exists posts_delete_own   on public.posts;
create policy posts_delete_own   on public.posts for delete using (auth.uid() = author);
drop policy if exists posts_admin_delete on public.posts;
create policy posts_admin_delete on public.posts for delete using (public.is_admin());

-- ---- comments ----
drop policy if exists comments_read         on public.comments;
create policy comments_read         on public.comments for select using (true);
drop policy if exists comments_insert_auth  on public.comments;
create policy comments_insert_auth  on public.comments for insert with check (auth.uid() = author);
drop policy if exists comments_delete_own   on public.comments;
create policy comments_delete_own   on public.comments for delete using (auth.uid() = author);
drop policy if exists comments_admin_delete on public.comments;
create policy comments_admin_delete on public.comments for delete using (public.is_admin());

-- ============================================================
-- 8) 본인을 관리자로 지정  ← 이메일을 본인 가입 이메일로 교체!
--    (먼저 커뮤니티에서 회원가입을 끝낸 뒤 실행하세요)
-- ============================================================
update public.profiles set is_admin = true
 where id = (select id from auth.users where email = 'YOUR@EMAIL.com');

-- 확인용 (선택): 관리자 목록
-- select nickname, role, is_admin from public.profiles where is_admin;
