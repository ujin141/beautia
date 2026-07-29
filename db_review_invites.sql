-- ============================================================
-- 후기를 예약에서 떼어낸다 — 기존 손님도 후기를 남길 수 있게
--
-- 지금 문제:
--   designer_reviews.booking 이 NOT NULL 이고, insert 정책이
--   "그 예약의 손님이 로그인해서 + status='done'" 일 때만 허용한다.
--   그래서 Beautia 로 예약하지 않은 손님(인스타로 온 손님, 예전 손님,
--   그냥 걸어온 손님)은 후기를 남길 방법이 아예 없다.
--
--   결과: 후기 0개 → 믿을 근거 없음 → 예약 안 함 → 완료된 예약 없음 → 후기 0개.
--   디자이너를 아무리 늘려도 이 고리는 안 풀린다. 구조가 막고 있다.
--
-- 해결:
--   디자이너가 1회용 링크를 만들어 손님에게 보낸다. 손님은 로그인 없이
--   그 링크로만 후기를 쓴다. (예약도 이미 계정 없이 되므로 일관된다)
--
--   토큰 검증·저장은 Edge Function(review-guest)이 service_role 로 처리한다.
--   익명 클라이언트에 insert 권한을 열면 토큰을 쥔 사람이 여러 개를 밀어넣거나
--   경합으로 used_at 을 우회할 수 있어서, 서버에서 한 번에 처리한다.
--
-- Supabase → SQL Editor 에서 실행. 여러 번 실행해도 안전.
-- ============================================================

-- ── 1) 1회용 후기 초대 ────────────────────────────────────────
create table if not exists public.review_invites (
  token       text primary key,
  designer    uuid not null references auth.users(id) on delete cascade,
  label       text,                                   -- 디자이너 메모(누구에게 보냈는지)
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '60 days',
  used_at     timestamptz,
  constraint rvi_label_len check (char_length(coalesce(label,'')) <= 60)
);

comment on table public.review_invites is
  '디자이너가 기존 손님에게 보내는 1회용 후기 링크. 예약 없이 후기를 받기 위한 통로.';

create index if not exists rvi_designer_idx on public.review_invites(designer, created_at desc);

-- 디자이너는 자기 초대만 보고 만든다. 수정·삭제는 서버(Edge Function)만.
alter table public.review_invites enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies
                  where schemaname='public' and tablename='review_invites' and policyname='rvi_own_read') then
    create policy rvi_own_read on public.review_invites
      for select using (auth.uid() = designer);
  end if;
end $$;

-- ── 2) designer_reviews 를 예약 없이도 쓸 수 있게 ──────────────
-- booking: 예약 후기는 그대로 두고, 초대 후기는 NULL 이 된다.
--   (Postgres 에서 UNIQUE 컬럼의 NULL 은 서로 충돌하지 않으므로 제약은 그대로 살아 있다)
alter table public.designer_reviews alter column booking  drop not null;
-- customer: 손님이 비로그인이면 auth 계정이 없다.
alter table public.designer_reviews alter column customer drop not null;

alter table public.designer_reviews
  add column if not exists invite      text references public.review_invites(token) on delete set null,
  add column if not exists author_name text;

comment on column public.designer_reviews.invite is
  '초대 링크로 받은 후기면 그 토큰. 예약 후기는 NULL.';
comment on column public.designer_reviews.author_name is
  '비로그인 손님이 적은 표시 이름. 로그인 후기는 NULL(프로필에서 가져온다).';

alter table public.designer_reviews
  drop constraint if exists drv_author_name_len;
alter table public.designer_reviews
  add constraint drv_author_name_len check (char_length(coalesce(author_name,'')) <= 24);

-- 초대 하나당 후기 하나. 함수의 used_at 검사와 별개로 DB 에서도 막는다.
create unique index if not exists drv_invite_uidx
  on public.designer_reviews(invite) where invite is not null;

-- 예약 후기든 초대 후기든, 둘 중 하나에는 반드시 속해야 한다.
-- (출처 없는 후기가 들어오는 걸 DB 에서 막는다)
alter table public.designer_reviews
  drop constraint if exists drv_source_required;
alter table public.designer_reviews
  add constraint drv_source_required check (booking is not null or invite is not null);

-- ── 3) 확인 ──────────────────────────────────────────────────
select column_name, is_nullable, data_type
  from information_schema.columns
 where table_schema='public' and table_name='designer_reviews'
   and column_name in ('booking','customer','invite','author_name')
 order by column_name;
