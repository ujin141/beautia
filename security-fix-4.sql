-- ============================================================
-- 보안 하드닝 라운드8 — 포인트 위조/파밍 완전 차단 (RT-12)
-- 클라가 부르는 claim_points 폐기 → 서버가 실제 행(글/댓글/가입)에만 적립
-- Supabase SQL Editor에서 1회 실행 (security-fix.sql 이후)
-- ============================================================

-- 클라가 임의로 부르던 RPC 폐기 (action/akey 위조 파밍 원천 차단)
drop function if exists public.claim_points(text, text);

-- [BT-12a] 글 작성 시 서버가 자동 적립 (post/review + 사진·장문 보너스)
--   akey를 글 ID로 고정 → 같은 글은 1회만, 위조 불가
create or replace function public.pts_on_post()
returns trigger language plpgsql security definer set search_path = public as $pp$
begin
  if NEW.author is null then return NEW; end if;
  insert into public.point_ledger(user_id, akey, amount, reason)
    values (NEW.author, 'post:'||NEW.id::text,
            case when NEW.cat='후기' then 500 else 100 end,
            case when NEW.cat='후기' then 'review' else 'post' end)
    on conflict do nothing;
  if coalesce(array_length(NEW.imgs,1),0) >= 3 then
    insert into public.point_ledger(user_id, akey, amount, reason)
      values (NEW.author, 'photo:'||NEW.id::text, 100, 'photo') on conflict do nothing;
  end if;
  if char_length(coalesce(NEW.content,'')) >= 300 then
    insert into public.point_ledger(user_id, akey, amount, reason)
      values (NEW.author, 'detail:'||NEW.id::text, 100, 'detail') on conflict do nothing;
  end if;
  return NEW;
end; $pp$;
drop trigger if exists trg_pts_post on public.posts;
create trigger trg_pts_post after insert on public.posts
  for each row execute function public.pts_on_post();

-- [BT-12b] 댓글 작성 시 자동 적립 (댓글 ID로 고정)
create or replace function public.pts_on_comment()
returns trigger language plpgsql security definer set search_path = public as $pc$
begin
  if NEW.author is null then return NEW; end if;
  insert into public.point_ledger(user_id, akey, amount, reason)
    values (NEW.author, 'comment:'||NEW.id::text, 20, 'comment') on conflict do nothing;
  return NEW;
end; $pc$;
drop trigger if exists trg_pts_comment on public.comments;
create trigger trg_pts_comment after insert on public.comments
  for each row execute function public.pts_on_comment();

-- [BT-12c] 가입(프로필 최초 생성) 시 1,000P (계정당 1회)
create or replace function public.pts_on_signup()
returns trigger language plpgsql security definer set search_path = public as $ps$
begin
  if NEW.nickname is not null and NEW.nickname <> '' then
    insert into public.point_ledger(user_id, akey, amount, reason)
      values (NEW.id, 'signup', 1000, 'signup') on conflict do nothing;
  end if;
  return NEW;
end; $ps$;
drop trigger if exists trg_pts_signup on public.profiles;
create trigger trg_pts_signup after insert on public.profiles
  for each row execute function public.pts_on_signup();

-- [BT-12d] 친구초대: 초대자·피초대자 둘 다 3,000P (각 1회, 유효 코드일 때만)
create or replace function public.award_referral(inviter_code text)
returns void language plpgsql security definer set search_path = public as $ar$
declare inv uuid;
begin
  if inviter_code is null or inviter_code = '' then return; end if;
  select id into inv from public.profiles where ref_code = inviter_code limit 1;
  if inv is null or inv = auth.uid() then return; end if;
  insert into public.point_ledger(user_id, akey, amount, reason)
    values (inv, 'ref_from:'||auth.uid()::text, 3000, '친구 초대') on conflict do nothing;
  insert into public.point_ledger(user_id, akey, amount, reason)
    values (auth.uid(), 'invited', 3000, '초대로 가입') on conflict do nothing;
end; $ar$;
grant execute on function public.award_referral(text) to authenticated;
