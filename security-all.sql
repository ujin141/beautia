-- ============================================================
-- Beautia 보안 패치 통합본 (security-all.sql)
-- supabase-setup.sql 을 먼저 1회 실행한 뒤, 이 파일을 통째로 실행하세요.
-- 포함: 포인트/초대(add-points) + 권한·위조·길이(security-fix)
--       + 도배·닉네임·스토리지(security-fix-2) + 모더레이션(security-fix-3)
-- 모두 재실행 안전(idempotent).
-- ============================================================

-- ========== [1/4] add-points.sql ==========
-- 포인트·친구초대 "진짜 작동"용 SQL (Supabase SQL Editor에서 1회 실행)
-- 기존엔 localStorage뿐이라 로그아웃 시 사라지고 초대 적립도 안 됐음 → DB로 전환

-- 1) 프로필에 포인트·초대코드 컬럼
alter table public.profiles add column if not exists points    integer default 0;
alter table public.profiles add column if not exists ref_code  text;

-- 2) 적립 원장(ledger): 모든 적립 기록 + 중복 방지
create table if not exists public.point_ledger (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users(id) on delete cascade,
  akey       text,                 -- 중복 방지 키(가입/초대/글 등). null이면 매번 적립(댓글 등)
  amount     integer not null,
  reason     text,
  created_at timestamptz default now()
);
-- 같은 (유저, akey) 중복 적립 금지 (akey 있는 경우만)
create unique index if not exists point_ledger_user_akey
  on public.point_ledger(user_id, akey) where akey is not null;

alter table public.point_ledger enable row level security;
drop policy if exists point_ledger_read on public.point_ledger;
create policy point_ledger_read on public.point_ledger for select
  using (auth.uid() = user_id or public.is_admin());
drop policy if exists point_ledger_insert on public.point_ledger;
create policy point_ledger_insert on public.point_ledger for insert
  with check (auth.uid() = user_id);

-- 3) 적립되면 profiles.points 자동 합산
create or replace function public.sync_points()
returns trigger language plpgsql security definer set search_path = public as $sp$
begin
  update public.profiles set points = coalesce(points,0) + NEW.amount where id = NEW.user_id;
  return NEW;
end; $sp$;
drop trigger if exists trg_point_ledger on public.point_ledger;
create trigger trg_point_ledger after insert on public.point_ledger
  for each row execute function public.sync_points();

-- 4) 친구초대: 초대받은 사람이 호출 → 초대한 사람에게 3,000P 적립(1인당 1회)
create or replace function public.award_referral(inviter_code text)
returns void language plpgsql security definer set search_path = public as $ar$
declare inv uuid;
begin
  if inviter_code is null or inviter_code = '' then return; end if;
  select id into inv from public.profiles where ref_code = inviter_code limit 1;
  if inv is null or inv = auth.uid() then return; end if;
  insert into public.point_ledger(user_id, akey, amount, reason)
    values (inv, 'ref_from:'||auth.uid()::text, 3000, '친구 초대')
    on conflict do nothing;
end; $ar$;
grant execute on function public.award_referral(text) to authenticated;

-- ========== [2/4] security-fix.sql ==========
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

-- ========== [3/4] security-fix-2.sql ==========
-- ============================================================
-- 보안 하드닝 라운드4 — Supabase SQL Editor에서 1회 실행
-- (1) 글/댓글 도배 레이트리밋(서버측, 우회불가)  (2) 닉네임 예약어/금칙어 필터
-- ※ supabase-setup.sql / add-points.sql / security-fix.sql 실행 후 돌리세요.
-- ============================================================

-- [BT-4] 글 도배 차단: 20초에 1개, 1시간에 20개 초과 금지 -------
create or replace function public.rl_posts()
returns trigger language plpgsql security definer set search_path = public as $rp$
declare c_short int; c_hour int;
begin
  if NEW.author is null then return NEW; end if;           -- 시드(서버) insert는 예외
  if public.is_admin() then return NEW; end if;            -- 관리자는 예외
  select count(*) into c_short from public.posts
    where author = NEW.author and created_at > now() - interval '20 seconds';
  if c_short >= 1 then raise exception 'RATE_LIMIT_POST' using errcode='P0001'; end if;
  select count(*) into c_hour from public.posts
    where author = NEW.author and created_at > now() - interval '1 hour';
  if c_hour >= 20 then raise exception 'RATE_LIMIT_POST_HOUR' using errcode='P0001'; end if;
  return NEW;
end; $rp$;
drop trigger if exists trg_rl_posts on public.posts;
create trigger trg_rl_posts before insert on public.posts
  for each row execute function public.rl_posts();

-- [BT-4] 댓글 도배 차단: 8초에 1개, 1시간에 80개 초과 금지 ------
create or replace function public.rl_comments()
returns trigger language plpgsql security definer set search_path = public as $rc$
declare c_short int; c_hour int;
begin
  if NEW.author is null then return NEW; end if;
  if public.is_admin() then return NEW; end if;
  select count(*) into c_short from public.comments
    where author = NEW.author and created_at > now() - interval '8 seconds';
  if c_short >= 1 then raise exception 'RATE_LIMIT_COMMENT' using errcode='P0001'; end if;
  select count(*) into c_hour from public.comments
    where author = NEW.author and created_at > now() - interval '1 hour';
  if c_hour >= 80 then raise exception 'RATE_LIMIT_COMMENT_HOUR' using errcode='P0001'; end if;
  return NEW;
end; $rc$;
drop trigger if exists trg_rl_comments on public.comments;
create trigger trg_rl_comments before insert on public.comments
  for each row execute function public.rl_comments();

-- [BT-5] 닉네임 예약어/금칙어 필터 (사칭·욕설 차단) -------------
create or replace function public.guard_nickname()
returns trigger language plpgsql security definer set search_path = public as $gn$
declare low text;
begin
  if public.is_admin() then return NEW; end if;
  if NEW.nickname is null then return NEW; end if;
  low := lower(replace(NEW.nickname, ' ', ''));
  -- 예약어(공식/운영진 사칭) + 영문 변형
  if low ~ '(beautia|뷰티아|운영자|운영팀|관리자|어드민|admin|공식|official|staff|스태프|모더레이터|moderator)' then
    raise exception 'RESERVED_NICKNAME' using errcode='P0001';
  end if;
  -- 금칙어(욕설 — 기본 목록, 필요시 추가)
  if low ~ '(시발|씨발|tlqkf|ㅅㅂ|병신|ㅂㅅ|개새|좆|존나|지랄|닥쳐|fuck|shit|bitch|섹스|sex|야동)' then
    raise exception 'BANNED_NICKNAME' using errcode='P0001';
  end if;
  return NEW;
end; $gn$;
drop trigger if exists trg_guard_nick on public.profiles;
create trigger trg_guard_nick before insert or update on public.profiles
  for each row execute function public.guard_nickname();

-- [BT-6] 스토리지 업로드 남용 차단: 이미지 5MB·이미지 타입만 ----
update storage.buckets
  set file_size_limit = 5242880,   -- 5MB
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/heic']
  where id = 'beautia';

-- ========== [4/4] security-fix-3.sql ==========
-- ============================================================
-- 보안 하드닝 라운드6 — 모더레이션 우회 차단
-- RT-9 숨김글 API 노출 / RT-10 차단유저 작성 우회
-- Supabase SQL Editor에서 1회 실행 (앞 SQL들 실행 후)
-- ============================================================

-- 차단 여부 판별 (RLS 재귀 방지용 security definer)
create or replace function public.is_blocked()
returns boolean language sql security definer stable set search_path = public as $ib$
  select coalesce((select p.blocked from public.profiles p where p.id = auth.uid()), false);
$ib$;
grant execute on function public.is_blocked() to anon, authenticated;

-- [BT-9] 숨김글은 작성자·관리자만 조회 (그 외엔 안 보임) ----------
drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select
  using (hidden = false or author = auth.uid() or public.is_admin());

-- [BT-10] 차단된 유저는 글·댓글 작성 불가 ------------------------
drop policy if exists posts_insert_auth on public.posts;
create policy posts_insert_auth on public.posts for insert
  with check (auth.uid() = author and not public.is_blocked());

drop policy if exists comments_insert_auth on public.comments;
create policy comments_insert_auth on public.comments for insert
  with check (auth.uid() = author and not public.is_blocked());

-- (참고) 차단 유저의 좋아요/스크랩도 막고 싶으면:
drop policy if exists post_likes_insert_self on public.post_likes;
create policy post_likes_insert_self on public.post_likes for insert
  with check (auth.uid() = user_id and not public.is_blocked());
