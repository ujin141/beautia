-- ============================================================
-- 보안 교정 #1 — role 자가승격 → 쿠폰 어드민 탈취 차단 (BLOCKER)
--  근거(실 DB 확인):
--   · guard_profile_update()가 role='official'만 막고 'owner'는 통과 → 누구나 role='owner' 자가설정
--   · 쿠폰 5개 정책만 admin을 role in ('owner','official') 텍스트로 판별(나머지 테이블은 전부 is_admin())
--   · is_admin=true 계정 0개 → 오너(ujin141)는 이메일 정책으로만 admin, is_admin()은 현재 전원 false
--     → 그 결과 어드민 플랫폼 쿠폰 생성이 실제로는 RLS로 막혀있음(기능 버그 겸)
--  방침:
--   · is_admin() = is_admin 컬럼 OR 오너 이메일 (기존 profiles_owner_all/bookings_owner_read 패턴과 일치)
--   · 특권 role(owner/official/admin) 자가승격 차단 (designer/customer 셀프가입은 그대로 허용)
--   · 쿠폰 RLS admin 판별을 role 텍스트 → is_admin() 으로 (승격 우회 무력화 + 오너 쿠폰 어드민 복구)
--  안전하게 여러 번 실행 가능(idempotent). 정상 흐름(디자이너 셀프가입/프로필 저장/디자이너 승인) 미영향.
-- ============================================================

-- 1) is_admin(): is_admin 컬럼 OR 오너 이메일
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false)
      or coalesce((auth.jwt() ->> 'email') = 'ujin141@naver.com', false);
$$;

-- 2) guard_profile_update(): 특권 승격 차단 — ★INSERT까지 커버★
--    (레드팀 발견: is_admin 컬럼이 INSERT로 설정 가능했고 가드는 UPDATE 전용이라
--     새 계정이 {is_admin:true, role:'owner'}로 INSERT하면 탈취가 그대로 가능했음)
create or replace function public.guard_profile_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    if TG_OP = 'INSERT' then
      NEW.is_admin := false;                      -- 신규 프로필은 절대 관리자 아님(정상 가입은 미전송)
      NEW.blocked  := false;
      if NEW.role in ('owner','official','admin') then
        NEW.role := 'guest';                      -- 최초 생성 시 특권 role 사칭 차단
      end if;
      -- points/ref_code 는 기본값 + trg_pts_signup(AFTER INSERT)에 위임
    else
      NEW.is_admin := OLD.is_admin;               -- 관리자 자가승격 차단
      NEW.blocked  := OLD.blocked;                -- 차단 해제 자가조작 차단
      if NEW.role in ('owner','official','admin')
         and NEW.role is distinct from OLD.role then
        NEW.role := coalesce(OLD.role, 'guest');  -- 특권 role 자가승격 차단(공식/오너/관리자)
      end if;
      if current_setting('app.pts_ok', true) is distinct from '1' then
        NEW.points := OLD.points;                 -- 포인트 직접수정 차단(트리거 경유만)
      end if;
      if OLD.ref_code is not null then
        NEW.ref_code := OLD.ref_code;             -- 초대코드 위조 차단
      end if;
    end if;
  end if;
  return NEW;
end;
$$;

-- 가드를 INSERT+UPDATE 양쪽에 걸어 재생성(기존 UPDATE 전용 트리거 교체)
drop trigger if exists trg_guard_profile on public.profiles;
create trigger trg_guard_profile before insert or update on public.profiles
  for each row execute function public.guard_profile_update();

-- 3) 쿠폰 RLS: admin 판별을 is_admin()으로 통일 (role 텍스트 신뢰 제거)
--    coupons — SELECT/INSERT/UPDATE/DELETE
drop policy if exists coupons_select on public.coupons;
create policy coupons_select on public.coupons for select
  using ( active = true or issuer = auth.uid() or public.is_admin() );
  -- 주의: active=true 공개읽기(비밀 code 노출)는 별도 교정 #2(redeem RPC)에서 제거 예정

drop policy if exists coupons_insert on public.coupons;
create policy coupons_insert on public.coupons for insert
  with check (
    ( scope = 'designer' and issuer = auth.uid()
      and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'designer') )
    or public.is_admin()
  );

drop policy if exists coupons_update on public.coupons;
create policy coupons_update on public.coupons for update
  using ( issuer = auth.uid() or public.is_admin() )
  with check ( issuer = auth.uid() or public.is_admin() );

drop policy if exists coupons_delete on public.coupons;
create policy coupons_delete on public.coupons for delete
  using ( issuer = auth.uid() or public.is_admin() );

--    user_coupons — SELECT (보유자 / 발행자 / 어드민)
drop policy if exists uc_select on public.user_coupons;
create policy uc_select on public.user_coupons for select
  using (
    holder = auth.uid()
    or exists (select 1 from public.coupons c where c.id = coupon and c.issuer = auth.uid())
    or public.is_admin()
  );
