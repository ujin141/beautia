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
