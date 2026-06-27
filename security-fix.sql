-- ============================================================
-- 보안 하드닝 (Red→Blue 라운드 1) — Supabase SQL Editor에서 1회 실행
-- RT-1 권한상승 차단 / RT-3 포인트 위조 차단
-- ※ add-points.sql 을 먼저 실행한 뒤 이걸 실행하세요.
-- ============================================================

-- [BT-1] 권한상승 차단 ----------------------------------------
-- 일반 유저가 자기 프로필을 수정할 때 is_admin/blocked/points/ref_code 를
-- 임의로 바꾸지 못하게 막는다. (관리자는 허용, 포인트는 적립 트리거 경유만 허용)
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $g$
begin
  if not public.is_admin() then
    NEW.is_admin := OLD.is_admin;          -- 관리자 자가승격 차단
    NEW.blocked  := OLD.blocked;           -- 차단 해제 자가조작 차단
    if NEW.role = 'official' and OLD.role is distinct from 'official' then
      NEW.role := coalesce(OLD.role, 'guest');  -- 공식(Beautia) 계정 사칭 차단
    end if;
    if current_setting('app.pts_ok', true) is distinct from '1' then
      NEW.points := OLD.points;            -- 포인트 직접수정 차단(트리거 경유만)
    end if;
    if OLD.ref_code is not null then
      NEW.ref_code := OLD.ref_code;        -- 초대코드 위조 차단(최초 1회만 설정)
    end if;
  end if;
  return NEW;
end; $g$;
drop trigger if exists trg_guard_profile on public.profiles;
create trigger trg_guard_profile before update on public.profiles
  for each row execute function public.guard_profile_update();

-- 적립 트리거가 points 를 올릴 때만 통과되도록 플래그를 세운다
create or replace function public.sync_points()
returns trigger language plpgsql security definer set search_path = public as $sp$
begin
  perform set_config('app.pts_ok', '1', true);   -- 이 트랜잭션 한정 허용
  update public.profiles set points = coalesce(points,0) + NEW.amount where id = NEW.user_id;
  return NEW;
end; $sp$;

-- [BT-2] 포인트 위조 차단 ------------------------------------
-- 클라이언트가 point_ledger 에 직접 INSERT 하지 못하게 막고(금액 위조 방지),
-- 서버가 금액을 정하는 RPC(claim_points)로만 적립하게 한다.
drop policy if exists point_ledger_insert on public.point_ledger;
create policy point_ledger_insert on public.point_ledger
  for insert with check (false);     -- 직접 insert 전면 차단 (RPC는 security definer라 우회)

create or replace function public.claim_points(p_action text, p_akey text default null)
returns void language plpgsql security definer set search_path = public as $c$
declare amt integer;
begin
  if auth.uid() is null then return; end if;
  amt := case p_action
    when 'signup'  then 1000
    when 'invite'  then 3000
    when 'post'    then 100
    when 'review'  then 500
    when 'photo'   then 100
    when 'detail'  then 100
    when 'comment' then 20
    else 0 end;
  if amt = 0 then return; end if;
  insert into public.point_ledger(user_id, akey, amount, reason)
    values (auth.uid(), p_akey, amt, p_action)
    on conflict do nothing;
end; $c$;
grant execute on function public.claim_points(text, text) to authenticated;

-- award_referral 도 클라 금액을 안 받고 서버가 3000 고정(이미 그렇게 되어 있음).

-- [BT-3] API 직접 호출(클라 maxlength 우회) 대용량/도배 방어 — 길이·개수 제한
--  not valid: 기존 행은 검사 안 하고 새 행부터 적용(안전)
alter table public.posts    drop constraint if exists posts_len_chk;
alter table public.posts    add  constraint posts_len_chk
  check (char_length(coalesce(title,'')) <= 200
         and char_length(coalesce(content,'')) <= 8000
         and coalesce(array_length(imgs,1),0) <= 6
         and coalesce(array_length(tags,1),0) <= 12) not valid;

alter table public.comments drop constraint if exists comments_len_chk;
alter table public.comments add  constraint comments_len_chk
  check (char_length(coalesce(content,'')) <= 3000) not valid;

alter table public.applications drop constraint if exists applications_len_chk;
alter table public.applications add  constraint applications_len_chk
  check (char_length(coalesce(intro,'')) <= 2000
         and coalesce(array_length(photos,1),0) <= 6) not valid;
