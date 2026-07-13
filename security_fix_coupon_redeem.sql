-- ============================================================
-- 보안 교정 #2 — 쿠폰 비밀코드 노출 + 한도 미집행 + 사용 되돌리기 (HIGH)
--  근거:
--   · coupons_select 의 active=true 분기 → 누구나 전 활성쿠폰의 code/value/max_uses 덤프 가능(비공개 코드 무력화)
--   · max_uses/used_count 검사·증가 트리거 전무 → 한도 장식용, 무제한 등록
--   · 등록이 클라이언트 원문 eq 조회라 대소문자 불일치('summer'≠'SUMMER')로 유효코드 등록 실패
--   · user_coupons.uc_update 가 with_check 없어 보유자가 used→active 되돌려 재사용 가능
--  방침:
--   · redeem_coupon(code) SECURITY DEFINER RPC 로 조회+검증+등록+집계를 서버측 원자 처리(코드 미노출·대소문자 무시·한도 원자검사)
--   · coupons_select 에서 active=true 공개읽기 제거 → 발행자/보유자/어드민만 (보유자는 보유쿠폰 표시용 읽기 유지)
--   · user_coupons 보유자 UPDATE 가드: 사용 되돌리기·불변필드 변경 차단
--  멱등. is_admin() 은 교정 #1 정의 사용.
-- ============================================================

-- 1) coupons_select: 공개읽기(active=true) 제거, 보유자 표시용 읽기 추가
drop policy if exists coupons_select on public.coupons;
create policy coupons_select on public.coupons for select
  using (
    issuer = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.user_coupons uc
               where uc.coupon = coupons.id and uc.holder = auth.uid())
  );

-- 2) 등록 RPC — 코드로 조회+검증+발급+used_count 증가를 서버측 원자 처리
--    (SECURITY DEFINER 로 RLS 우회해 코드를 클라이언트에 노출하지 않음)
create or replace function public.redeem_coupon(p_code text)
returns public.user_coupons
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  c public.coupons;
  uc public.user_coupons;
begin
  if v_uid is null then
    raise exception 'auth_required' using errcode = '28000';
  end if;
  if p_code is null or length(trim(p_code)) = 0 then
    raise exception 'invalid_code' using errcode = 'P0002';
  end if;

  -- 동일 쿠폰 동시 등록 직렬화(한도 레이스 방지)
  select * into c from public.coupons
    where upper(code) = upper(trim(p_code))
    order by created_at asc
    limit 1
    for update;

  if not found or c.active is not true then
    raise exception 'invalid_code' using errcode = 'P0002';
  end if;
  if c.expires_at is not null and c.expires_at <= now() then
    raise exception 'expired' using errcode = 'P0003';
  end if;
  if c.max_uses is not null and coalesce(c.used_count,0) >= c.max_uses then
    raise exception 'exhausted' using errcode = 'P0004';
  end if;

  insert into public.user_coupons (coupon, holder)
    values (c.id, v_uid)
    returning * into uc;

  update public.coupons set used_count = coalesce(used_count,0) + 1 where id = c.id;
  return uc;
exception
  when unique_violation then
    raise exception 'already_redeemed' using errcode = '23505';
end;
$$;

revoke all on function public.redeem_coupon(text) from public, anon;
grant execute on function public.redeem_coupon(text) to authenticated;

-- 3) user_coupons 보유자 가드 — 사용 되돌리기·불변필드 변경 차단
create or replace function public.guard_user_coupon()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  is_issuer boolean;
begin
  select exists(select 1 from public.coupons c where c.id = OLD.coupon and c.issuer = auth.uid())
    into is_issuer;
  if not public.is_admin() and not is_issuer then
    NEW.coupon := OLD.coupon;                 -- 쿠폰 바꿔치기 차단
    NEW.holder := OLD.holder;                 -- 보유자 변경 차단
    if OLD.status = 'used' and NEW.status is distinct from 'used' then
      NEW.status  := OLD.status;              -- used→active 재사용 차단
      NEW.booking := OLD.booking;
      NEW.used_at := OLD.used_at;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_guard_user_coupon on public.user_coupons;
create trigger trg_guard_user_coupon before update on public.user_coupons
  for each row execute function public.guard_user_coupon();
