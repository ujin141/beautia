-- 조회수 저장용: posts.views 컬럼 + 증가 함수 (Supabase SQL Editor에서 1회 실행)
alter table public.posts add column if not exists views integer default 0;

-- 비로그인 포함 누구나 조회 시 +1 (RLS update 우회를 위해 security definer)
create or replace function public.bump_view(pid uuid)
returns void language sql security definer set search_path = public as $bv$
  update public.posts set views = coalesce(views,0) + 1 where id = pid;
$bv$;
grant execute on function public.bump_view(uuid) to anon, authenticated;
