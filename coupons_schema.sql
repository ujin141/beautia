-- ============================================================
-- Beautia 쿠폰 시스템 스키마
--  - coupons: 발행된 쿠폰(디자이너 또는 어드민/플랫폼)
--  - user_coupons: 고객이 보유/사용한 쿠폰
-- 설계: ₩·% 선택형 / 디자이너+어드민 발행 / 코드입력·목록받기 / 예약 시 적용(기록 방식)
-- Stripe 보증금 로직은 건드리지 않음(쿠폰은 예약에 기록되고 현장에서 적용).
-- 안전하게 여러 번 실행 가능(idempotent).
-- ============================================================

-- ---------- coupons ----------
create table if not exists public.coupons (
  id          uuid primary key default gen_random_uuid(),
  issuer      uuid references auth.users(id) on delete cascade,   -- null 이면 플랫폼(어드민) 발행
  scope       text not null default 'designer',                   -- 'designer' | 'platform'
  title       text not null,
  type        text not null default 'amount',                     -- 'amount'(정액 ₩) | 'percent'(비율 %)
  value       integer not null default 0,                         -- amount: 원 단위 / percent: 0~100
  currency    text not null default 'KRW',
  code        text unique,                                        -- 코드입력 등록용(선택). null 이면 목록받기 전용
  max_uses    integer,                                            -- 전체 사용 한도(null = 무제한)
  used_count  integer not null default 0,                         -- 발급/사용 누적
  expires_at  timestamptz,                                        -- 만료(null = 무기한)
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint coupons_scope_chk check (scope in ('designer','platform')),
  constraint coupons_type_chk  check (type in ('amount','percent')),
  constraint coupons_value_chk check (value >= 0 and (type <> 'percent' or value <= 100)),
  constraint coupons_title_len check (char_length(title) <= 120)
);
create index if not exists coupons_issuer_idx on public.coupons(issuer, created_at desc);
create index if not exists coupons_code_idx   on public.coupons(code);
create index if not exists coupons_active_idx on public.coupons(active, expires_at);

-- ---------- user_coupons (보유/사용 내역) ----------
create table if not exists public.user_coupons (
  id          uuid primary key default gen_random_uuid(),
  coupon      uuid not null references public.coupons(id) on delete cascade,
  holder      uuid not null references auth.users(id) on delete cascade,   -- 'user'는 예약어라 holder 사용
  status      text not null default 'active',                              -- 'active' | 'used' | 'expired'
  booking     uuid references public.bookings(id) on delete set null,       -- 예약 시 적용된 예약
  acquired_at timestamptz not null default now(),
  used_at     timestamptz,
  constraint uc_status_chk check (status in ('active','used','expired')),
  unique (coupon, holder)                                                    -- 쿠폰당 1인 1개(중복 등록 방지)
);
create index if not exists uc_holder_idx on public.user_coupons(holder, status);
create index if not exists uc_coupon_idx on public.user_coupons(coupon);

-- ============================================================
-- RLS
-- ============================================================
alter table public.coupons      enable row level security;
alter table public.user_coupons enable row level security;

-- ---- coupons ----
-- 조회: 활성 쿠폰은 누구나(등록/목록받기용) / 발행자 본인 / 어드민(owner·official)
drop policy if exists coupons_select on public.coupons;
create policy coupons_select on public.coupons for select
  using (
    active = true
    or issuer = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','official'))
  );

-- 생성: 디자이너는 자기 것(scope=designer, issuer=본인) / 어드민은 무엇이든
drop policy if exists coupons_insert on public.coupons;
create policy coupons_insert on public.coupons for insert
  with check (
    (scope = 'designer' and issuer = auth.uid()
       and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('designer','owner','official')))
    or
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','official'))
  );

-- 수정/삭제: 발행자 본인 또는 어드민
drop policy if exists coupons_update on public.coupons;
create policy coupons_update on public.coupons for update
  using (issuer = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','official')));

drop policy if exists coupons_delete on public.coupons;
create policy coupons_delete on public.coupons for delete
  using (issuer = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','official')));

-- ---- user_coupons ----
-- 조회: 보유자 본인 / 그 쿠폰 발행자(사용 현황 확인) / 어드민
drop policy if exists uc_select on public.user_coupons;
create policy uc_select on public.user_coupons for select
  using (
    holder = auth.uid()
    or exists (select 1 from public.coupons c where c.id = coupon and c.issuer = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','official'))
  );

-- 등록: 본인 것만, 활성·미만료 쿠폰만
drop policy if exists uc_insert on public.user_coupons;
create policy uc_insert on public.user_coupons for insert
  with check (
    holder = auth.uid()
    and exists (select 1 from public.coupons c
                where c.id = coupon and c.active = true and (c.expires_at is null or c.expires_at > now()))
  );

-- 수정(사용 처리 등): 보유자 본인 또는 발행자
drop policy if exists uc_update on public.user_coupons;
create policy uc_update on public.user_coupons for update
  using (holder = auth.uid()
     or exists (select 1 from public.coupons c where c.id = coupon and c.issuer = auth.uid()));
