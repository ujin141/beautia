-- ============================================================
-- 보안 하드닝 라운드9(마지막) — 저위험 잔여 정리
-- RT-13 입점신청 사진 용량 DoS / RT-14 숨김글 댓글 차단
-- Supabase SQL Editor에서 1회 실행 (앞 SQL들 이후)
-- ============================================================

-- [BT-13] 입점신청 사진 1장당 1.5MB 초과 / 6장 초과 / 소개 2000자 초과 차단
create or replace function public.guard_application()
returns trigger language plpgsql set search_path = public as $ga$
declare ph text;
begin
  if coalesce(array_length(NEW.photos,1),0) > 6 then
    raise exception 'TOO_MANY_PHOTOS' using errcode='P0001'; end if;
  if NEW.photos is not null then
    foreach ph in array NEW.photos loop
      if length(ph) > 1500000 then raise exception 'PHOTO_TOO_LARGE' using errcode='P0001'; end if;
    end loop;
  end if;
  if char_length(coalesce(NEW.intro,'')) > 2000 then
    raise exception 'INTRO_TOO_LONG' using errcode='P0001'; end if;
  return NEW;
end; $ga$;
drop trigger if exists trg_guard_application on public.applications;
create trigger trg_guard_application before insert on public.applications
  for each row execute function public.guard_application();

-- [BT-14] 숨김(모더레이션) 글에는 댓글 불가 (작성자/관리자 예외) ----
drop policy if exists comments_insert_auth on public.comments;
create policy comments_insert_auth on public.comments for insert
  with check (
    auth.uid() = author
    and not public.is_blocked()
    and ( public.is_admin()
          or exists (select 1 from public.posts p where p.id = post_id and p.hidden = false) )
  );
