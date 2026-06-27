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
