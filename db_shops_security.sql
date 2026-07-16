-- ============================================================
-- Beautia 보안 하드닝 · 지점(shops) 소속 사칭 방지
--   문제: profiles_self_update 정책이 본인 row 전체를 수정 허용 →
--        아무 디자이너나 자기 shop_id를 임의 지점으로 바꿔 그 브랜드에 무단 소속(사칭) 가능.
--   해결: profiles.shop_id 변경은 (a) 대상 지점의 원장, (b) 플랫폼 관리자,
--        (c) NULL로 해제(본인 탈퇴) 만 허용하는 트리거로 강제.
--   → "원장/관리자 승인" 모델. 직접 UPDATE든 RPC든 모두 이 규칙을 통과해야 함.
-- Supabase SQL Editor에서 실행 (여러 번 실행 안전).
-- ============================================================

create or replace function public.guard_profile_shop()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.shop_id is distinct from OLD.shop_id then
    -- 소속 해제(본인 탈퇴)는 허용 — RLS가 이미 본인 row로 제한
    if NEW.shop_id is null then
      return NEW;
    end if;
    -- 관리자는 어떤 지점이든 배치 가능
    if public.is_platform_admin() then
      return NEW;
    end if;
    -- 그 외에는 "대상 지점의 원장"만 배치 가능
    if exists (select 1 from public.shops s
                where s.id = NEW.shop_id and s.owner_id = auth.uid()) then
      return NEW;
    end if;
    raise exception '지점 소속은 지점 원장 또는 관리자만 배치할 수 있어요 (사칭 방지)';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_guard_profile_shop on public.profiles;
create trigger trg_guard_profile_shop
  before update of shop_id on public.profiles
  for each row execute function public.guard_profile_shop();

-- join_shop RPC 조정: 이제 "본인이 임의 지점에 self-가입"은 막고,
--   탈퇴(NULL)만 셀프서비스로 허용. (가입은 원장/관리자가 배치)
create or replace function public.join_shop(p_shop uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_shop is not null then
    raise exception '지점 가입은 원장/관리자가 배치합니다. 직접 가입은 불가해요.';
  end if;
  update public.profiles set shop_id = null where id = auth.uid();
end;
$$;

-- ------------------------------------------------------------
-- 지점 생성 남용(스팸) 제한 — 계정당 shops 개수 상한 + owner_id 위조 방지
--   대형 프랜차이즈(다수 지점)는 관리자(우진)가 온보딩하므로 관리자는 예외.
-- ------------------------------------------------------------
create or replace function public.guard_shop_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare cnt int;
begin
  if public.is_platform_admin() then
    return NEW;                                   -- 관리자는 무제한(프랜차이즈 온보딩)
  end if;
  if NEW.owner_id is distinct from auth.uid() then
    raise exception 'owner_id는 본인만 지정할 수 있어요';
  end if;
  select count(*) into cnt from public.shops where owner_id = auth.uid();
  if cnt >= 30 then
    raise exception '지점 생성 한도를 초과했어요 (계정당 최대 30개). 더 필요하면 문의해 주세요.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_guard_shop_insert on public.shops;
create trigger trg_guard_shop_insert
  before insert on public.shops
  for each row execute function public.guard_shop_insert();
