-- =====================================================================
-- Beautia · 마켓플레이스 (예약 요청 + 리뷰) — SQL Editor 에 통째로 붙여넣고 Run
-- 서비스 메뉴는 profiles.shop.services (jsonb) 에 저장되므로 별도 테이블 불필요.
-- 결제 없음(전면 무료 전략) — 예약은 "요청 → 수락/거절 → 완료" 상태 흐름만.
-- =====================================================================

-- 예약 요청
create table if not exists public.bookings (
  id          uuid primary key default gen_random_uuid(),
  customer    uuid not null references auth.users(id) on delete cascade,
  designer    uuid not null references auth.users(id) on delete cascade,
  service     jsonb not null default '{}',        -- {n:이름, p:가격문자열, du:소요}
  date        date,
  time        text,
  note        text,
  status      text not null default 'pending',    -- pending/accepted/declined/done/cancelled
  created_at  timestamptz not null default now(),
  constraint bookings_status_chk check (status in ('pending','accepted','declined','done','cancelled')),
  constraint bookings_note_len check (char_length(coalesce(note,'')) <= 1000)
);
create index if not exists bookings_customer_idx on public.bookings(customer, created_at desc);
create index if not exists bookings_designer_idx on public.bookings(designer, created_at desc);

alter table public.bookings enable row level security;

drop policy if exists bk_select on public.bookings;
create policy bk_select on public.bookings for select
  using (auth.uid() = customer or auth.uid() = designer);

drop policy if exists bk_insert on public.bookings;
create policy bk_insert on public.bookings for insert
  with check (auth.uid() = customer and customer <> designer);

-- 상태 변경: 디자이너(수락/거절/완료) 또는 고객(취소)
drop policy if exists bk_update on public.bookings;
create policy bk_update on public.bookings for update
  using (auth.uid() = customer or auth.uid() = designer)
  with check (auth.uid() = customer or auth.uid() = designer);

-- 리뷰 (완료된 예약당 1개, 공개 읽기)
-- ※ 테이블명이 designer_reviews 인 이유: 옛 컨셉의 public.reviews(shop_id/rating/content)가
--   이미 존재해서 이름 충돌 → 옛 테이블은 건드리지 않고 새 이름 사용.
create table if not exists public.designer_reviews (
  id          uuid primary key default gen_random_uuid(),
  booking     uuid not null unique references public.bookings(id) on delete cascade,
  customer    uuid not null references auth.users(id) on delete cascade,
  designer    uuid not null references auth.users(id) on delete cascade,
  stars       int  not null check (stars between 1 and 5),
  body        text,
  created_at  timestamptz not null default now(),
  constraint drv_body_len check (char_length(coalesce(body,'')) <= 1000)
);
create index if not exists drv_designer_idx on public.designer_reviews(designer, created_at desc);

alter table public.designer_reviews enable row level security;

drop policy if exists drv_read on public.designer_reviews;
create policy drv_read on public.designer_reviews for select using (true);

-- 본인이 고객이고, 해당 예약이 done 상태일 때만 작성 가능
drop policy if exists drv_insert on public.designer_reviews;
create policy drv_insert on public.designer_reviews for insert
  with check (
    auth.uid() = customer
    and exists (select 1 from public.bookings b
                where b.id = booking and b.customer = auth.uid()
                  and b.designer = designer and b.status = 'done')
  );

-- 실시간: supabase_realtime 퍼블리케이션이 FOR ALL TABLES 라 자동 포함(별도 add 시 55000 에러).
