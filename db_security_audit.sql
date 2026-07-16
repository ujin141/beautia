-- ============================================================
-- Beautia 보안 자가진단 (읽기전용 · 안전) — Supabase SQL Editor에서 실행
-- 결과가 '한 줄도 없어야' 정상. 나오면 그 항목을 조치.
-- ============================================================

-- 1) public 스키마에서 RLS가 꺼진 테이블 (있으면 위험: 아무나 읽기/쓰기 가능)
select 'RLS_DISABLED' as issue, c.relname as object
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and c.relrowsecurity=false
order by 2;

-- 2) RLS는 켰지만 정책이 하나도 없는 테이블 (모두 차단되거나 의도치 않게 막힘)
select 'RLS_NO_POLICY' as issue, c.relname as object
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and c.relrowsecurity=true
  and not exists (select 1 from pg_policy p where p.polrelid=c.oid)
order by 2;

-- 3) SECURITY DEFINER 함수 중 search_path 미고정 (search_path 인젝션 위험)
select 'DEFINER_NO_SEARCHPATH' as issue, p.proname as object
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef=true
  and not exists (select 1 from unnest(coalesce(p.proconfig,'{}')) x where x like 'search_path=%')
order by 2;

-- 4) anon 롤에 INSERT/UPDATE/DELETE 권한이 있는 public 테이블 (보통 select만 있어야 함)
select 'ANON_WRITE_GRANT' as issue, table_name as object, privilege_type
from information_schema.role_table_grants
where grantee='anon' and table_schema='public' and privilege_type in ('INSERT','UPDATE','DELETE')
order by 2;

-- 5) auth.users 를 노출하는 public 뷰 (개인정보/이메일 유출 위험)
select 'VIEW_EXPOSES_AUTH' as issue, c.relname as object
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='v'
  and pg_get_viewdef(c.oid) ilike '%auth.users%'
order by 2;

-- 6) 지점 소속 가드 트리거가 설치돼 있는지 확인 (있어야 정상 = 1행)
select 'SHOP_GUARD_OK' as ok, tgname from pg_trigger where tgname='trg_guard_profile_shop';
