-- 보충 교정 — applications 테이블만 아직 anon INSERT 통과(201) → 남은 허용 정책 제거 + 권한 회수
-- (RLS 는 켜졌으나 옛 템플릿의 permissive INSERT 정책이 남아 anon 삽입을 허용하고 있었음)
-- 레거시/미사용 테이블이므로 완전 잠금(삼중: 정책삭제 + RLS + grant 회수). 멱등.

do $$
declare r record;
begin
  for r in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'applications'
  loop
    execute format('drop policy if exists %I on public.applications', r.policyname);
  end loop;
end $$;

alter table if exists public.applications enable row level security;
revoke all on public.applications from anon, authenticated;

-- 혹시 남은 잔재 테이블에도 permissive 정책이 있을 수 있으니 동일 처리(안전·멱등)
do $$
declare t text; r record;
begin
  foreach t in array array['shops','shop_menus','chat_rooms','chat_messages',
                           'community_posts','community_comments','reviews','categories',
                           'user_rewards','exchange_rates','system_settings']
  loop
    for r in select policyname from pg_policies where schemaname='public' and tablename=t
    loop execute format('drop policy if exists %I on public.%I', r.policyname, t); end loop;
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
