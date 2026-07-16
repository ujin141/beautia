-- ============================================================
-- Beautia — 브랜드 · 지점(샵) · 디자이너 3단 계층
--   브랜드 (brand)  →  지점 shops(branch)  →  디자이너 profiles.shop_id
-- 원장(오너)이 여러 지점을 관리하고, 지점마다 디자이너 여러 명을 배치한다.
-- Supabase SQL Editor 에서 한 번 실행하면 됨 (여러 번 실행해도 안전 / idempotent).
-- ============================================================

-- 1) shops 테이블 --------------------------------------------------
create table if not exists public.shops (
  id          uuid primary key default gen_random_uuid(),
  brand       text not null default '',          -- 브랜드명 (여러 지점이 공유: "차홍아르떼")
  branch      text not null default '',           -- 지점명 ("강남점")
  owner_id    uuid references auth.users(id) on delete set null,  -- 원장/오너
  address     text default '',
  city        text default '',
  country     text default '',                     -- ISO2 (KR/JP…) 권장
  lat         double precision,
  lng         double precision,
  hours       jsonb  default '{}'::jsonb,          -- {mon:{open:'10:00',close:'20:00',off:false}, ...}
  book_mode   text   default 'app',                -- 'app' | 'link'
  book_link   text   default '',                   -- book_mode='link' 일 때 외부 예약 URL
  logo        text   default '',
  cover       text   default '',
  phone       text   default '',
  active      boolean default true,
  created_at  timestamptz default now()
);

-- 이미 존재하는 shops 테이블이라면(옛 스키마) 빠진 컬럼을 채워 넣음
alter table public.shops add column if not exists brand      text not null default '';
alter table public.shops add column if not exists branch     text not null default '';
alter table public.shops add column if not exists owner_id   uuid references auth.users(id) on delete set null;
alter table public.shops add column if not exists address    text default '';
alter table public.shops add column if not exists city       text default '';
alter table public.shops add column if not exists country    text default '';
alter table public.shops add column if not exists lat        double precision;
alter table public.shops add column if not exists lng        double precision;
alter table public.shops add column if not exists hours      jsonb default '{}'::jsonb;
alter table public.shops add column if not exists book_mode  text default 'app';
alter table public.shops add column if not exists book_link  text default '';
alter table public.shops add column if not exists logo       text default '';
alter table public.shops add column if not exists cover      text default '';
alter table public.shops add column if not exists phone      text default '';
alter table public.shops add column if not exists active     boolean default true;
alter table public.shops add column if not exists created_at timestamptz default now();

create index if not exists shops_owner_idx  on public.shops(owner_id);
create index if not exists shops_brand_idx  on public.shops(brand);

-- 2) profiles ↔ shop 연결 -----------------------------------------
alter table public.profiles add column if not exists shop_id uuid
  references public.shops(id) on delete set null;
create index if not exists profiles_shop_idx on public.profiles(shop_id);

-- 중요: profiles 는 컬럼 단위 GRANT 로 하드닝돼 있을 수 있음.
-- 새로 추가한 shop_id 를 명시적으로 허용하지 않으면, 이 컬럼을 포함한 조회가
-- 통째로 401(42501 permission denied) → 손님에게 디자이너 목록이 안 보인다.
grant select (shop_id) on public.profiles to anon, authenticated;
grant update (shop_id) on public.profiles to authenticated;

-- 3) RLS ----------------------------------------------------------
-- 플랫폼 관리자(우진) 판별 — 어떤 지점이든 관리 가능하게 우회
create or replace function public.is_platform_admin()
returns boolean language sql stable set search_path = public as $$
  select coalesce(auth.jwt() ->> 'email','') = 'ujin141@naver.com'
$$;

alter table public.shops enable row level security;

-- 테이블 GRANT (RLS와 별개) — 롤에 테이블 접근권이 없으면 "permission denied for table shops"
grant select on public.shops to anon, authenticated;
grant insert, update, delete on public.shops to authenticated;

-- 읽기: 활성 지점은 누구나 (손님이 지점/브랜드 페이지를 봐야 함)
drop policy if exists shops_read on public.shops;
create policy shops_read on public.shops
  for select using (active = true or owner_id = auth.uid() or public.is_platform_admin());

-- 원장(또는 관리자)이 지점 생성/수정/삭제
drop policy if exists shops_owner_insert on public.shops;
create policy shops_owner_insert on public.shops
  for insert with check (owner_id = auth.uid() or public.is_platform_admin());

drop policy if exists shops_owner_update on public.shops;
create policy shops_owner_update on public.shops
  for update using (owner_id = auth.uid() or public.is_platform_admin())
  with check (owner_id = auth.uid() or public.is_platform_admin());

drop policy if exists shops_owner_delete on public.shops;
create policy shops_owner_delete on public.shops
  for delete using (owner_id = auth.uid() or public.is_platform_admin());

-- 4) 원장이 디자이너를 지점에 배치/해제하는 RPC ------------------
--    (남의 profiles.shop_id 를 직접 UPDATE 하려면 정책이 복잡해지므로
--     SECURITY DEFINER 로 "호출자가 그 지점의 원장인지"만 검사)
create or replace function public.owner_set_designer_shop(
  p_designer uuid,
  p_shop     uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_owner uuid;
begin
  if p_shop is null then
    -- 해제: 원장은 자기 지점 소속 디자이너만 뺄 수 있음
    update public.profiles pr
       set shop_id = null
     where pr.id = p_designer
       and (public.is_platform_admin()
            or exists (select 1 from public.shops s
                        where s.id = pr.shop_id and s.owner_id = auth.uid()));
    return;
  end if;
  select owner_id into v_owner from public.shops where id = p_shop;
  if not public.is_platform_admin() and (v_owner is null or v_owner <> auth.uid()) then
    raise exception 'not shop owner';
  end if;
  update public.profiles set shop_id = p_shop where id = p_designer;
end;
$$;

revoke all on function public.owner_set_designer_shop(uuid,uuid) from public;
grant execute on function public.owner_set_designer_shop(uuid,uuid) to authenticated;

-- 5) 디자이너 본인이 지점에 합류/탈퇴 (셀프서비스) ---------------
--    합류는 브랜드/지점 코드 없이도 되도록: 원장이 만든 지점을 골라 신청 대신
--    바로 연결(초대 링크 방식). 여기선 본인이 자기 shop_id 를 바꾸는 것만 허용.
-- 보안: self-가입은 사칭 위험이라 금지. 탈퇴(NULL)만 셀프서비스로 허용.
-- 가입 배치는 원장/관리자(owner_set_designer_shop). 상세는 db_shops_security.sql 참고.
create or replace function public.join_shop(p_shop uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_shop is not null then
    raise exception '지점 가입은 원장/관리자가 배치합니다. 직접 가입은 불가해요.';
  end if;
  update public.profiles set shop_id = null where id = auth.uid();
end;
$$;
revoke all on function public.join_shop(uuid) from public;
grant execute on function public.join_shop(uuid) to authenticated;

-- 6) 지점별 소속 디자이너 수 (지점 카드 표시용) -------------------
create or replace function public.shop_designer_counts()
returns table(shop_id uuid, n bigint)
language sql stable security definer set search_path = public as $$
  select shop_id, count(*) from public.profiles
   where shop_id is not null group by shop_id;
$$;
grant execute on function public.shop_designer_counts() to anon, authenticated;
