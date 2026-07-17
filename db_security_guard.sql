-- ============================================================
-- Beautia 보안요원 (Security Guard) — 라이브 감시 + 경보
--   백화점 보안요원처럼 24/7 순찰하며 수상한 일을 즉시 기록/경보한다.
--   구성: security_alerts(경보 기록) + 실시간 트리거(관리자 침입/새IP) + 순찰함수(남용 급증)
--   Supabase SQL Editor 에서 실행 (여러 번 실행 안전).
-- ============================================================

-- 1) 경보 기록 테이블 ------------------------------------------
create table if not exists public.security_alerts (
  id         bigserial primary key,
  kind       text not null,               -- admin_denied | admin_new_ip | abuse_signup | abuse_shop
  severity   text default 'med',          -- high | med | low
  detail     text default '',
  meta       jsonb default '{}'::jsonb,
  seen       boolean default false,
  created_at timestamptz default now()
);
create index if not exists sa_created_idx on public.security_alerts(created_at desc);

alter table public.security_alerts enable row level security;
-- 관리자만 조회/처리 (insert는 아래 SECURITY DEFINER 트리거/함수만 — 클라이언트 insert 권한 없음)
grant select, update on public.security_alerts to authenticated;
drop policy if exists sa_admin_read on public.security_alerts;
create policy sa_admin_read on public.security_alerts
  for select using (public.is_platform_admin());
drop policy if exists sa_admin_update on public.security_alerts;
create policy sa_admin_update on public.security_alerts
  for update using (public.is_platform_admin()) with check (public.is_platform_admin());

-- 2) 실시간 감시: /admin 접속 로그에 새 기록이 뜰 때 위험이면 즉시 경보 ----
create or replace function public.guard_admin_access()
returns trigger language plpgsql security definer set search_path = public as $$
declare seen_ip int; dup int;
begin
  if NEW.result = 'denied' then
    -- 같은 IP의 '거부' 경보가 1시간 내 있으면 중복 생략(플러딩 방지)
    select count(*) into dup from public.security_alerts
      where kind='admin_denied' and meta->>'ip' = NEW.ip and created_at > now()-interval '1 hour';
    if dup = 0 then
      insert into public.security_alerts(kind,severity,detail,meta)
      values('admin_denied','high',
        '권한 없는 관리자 접근 시도: '||coalesce(NEW.email,'?')||' ('||coalesce(NEW.ip,'?')||')',
        jsonb_build_object('ip',NEW.ip,'email',NEW.email,'city',NEW.city,'country',NEW.country));
    end if;
  elsif NEW.result = 'owner' and coalesce(NEW.ip,'') <> '' then
    -- 관리자가 처음 보는 IP에서 로그인 → 도난 세션 의심
    select count(*) into seen_ip from public.admin_access_log
      where result='owner' and ip = NEW.ip and id <> NEW.id;
    if seen_ip = 0 then
      insert into public.security_alerts(kind,severity,detail,meta)
      values('admin_new_ip','med',
        '새 IP에서 관리자 로그인: '||NEW.ip||' ('||coalesce(NEW.city||', ','')||coalesce(NEW.country,'')||')',
        jsonb_build_object('ip',NEW.ip,'city',NEW.city,'country',NEW.country));
    end if;
  elsif NEW.result = 'owner' then
    -- IP 확인 실패(조회 서비스 429/차단/오프라인). 이걸 조용히 넘기면 감시에 구멍이 난다:
    -- 공격자가 IP 조회만 막아도 위 admin_new_ip 경보를 통째로 회피할 수 있기 때문.
    -- '모른다'는 사실 자체를 경보로 올린다. (1시간 중복 억제)
    select count(*) into dup from public.security_alerts
      where kind='admin_ip_unknown' and created_at > now()-interval '1 hour';
    if dup = 0 then
      insert into public.security_alerts(kind,severity,detail,meta)
      values('admin_ip_unknown','med',
        '관리자 로그인 시 IP 확인 실패 — 조회 차단·한도 초과 의심 (새 IP 경보가 동작하지 않는 상태)',
        jsonb_build_object('email',NEW.email,'ua',NEW.ua));
    end if;
  end if;
  return NEW;
end $$;

drop trigger if exists trg_guard_admin_access on public.admin_access_log;
create trigger trg_guard_admin_access
  after insert on public.admin_access_log
  for each row execute function public.guard_admin_access();

-- 3) 순찰(주기 점검): 남용 급증 감지 -------------------------------
create or replace function public.patrol_security()
returns void language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) into n from public.profiles where created_at > now()-interval '10 minutes';
  if n >= 30 then
    insert into public.security_alerts(kind,severity,detail,meta)
    values('abuse_signup','med','10분간 신규 가입 급증: '||n||'건 (봇 가입 의심)', jsonb_build_object('count',n));
  end if;
  select count(*) into n from public.shops where created_at > now()-interval '1 hour';
  if n >= 20 then
    insert into public.security_alerts(kind,severity,detail,meta)
    values('abuse_shop','med','1시간 지점 생성 급증: '||n||'건 (스팸 의심)', jsonb_build_object('count',n));
  end if;
end $$;
grant execute on function public.patrol_security() to authenticated, service_role;

-- 4) 미확인 경보 개수(관리자 배지용) ------------------------------
create or replace function public.unseen_alert_count()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.security_alerts where seen = false;
$$;
grant execute on function public.unseen_alert_count() to authenticated;

-- ============================================================
-- (옵션 A) 24/7 자동 순찰 — pg_cron 설치 후 10분마다 patrol_security 실행:
--   create extension if not exists pg_cron;
--   select cron.schedule('beautia-patrol','*/10 * * * *', $$ select public.patrol_security(); $$);
--
-- (옵션 B) 폰 알림 — 실시간 경보를 우진 폰으로 밀어주려면 pg_net + notify 엣지함수 연동.
--   원하면 별도 스크립트로 붙여줌.
-- ============================================================


-- ── 과거 데이터 정리 ────────────────────────────────────────
-- IP 조회 실패를 빈 문자열('')로 기록하던 시절의 행. ''는 null과 달리 위 seen_ip 매칭에
-- 걸려서 "이미 본 IP"로 취급된다 → 새 IP 경보가 죽는다. null 로 통일한다.
-- (AFTER INSERT 트리거라 이 UPDATE 로는 경보가 발생하지 않는다. 안전.)
update public.admin_access_log
   set ip = null, city = null, country = null
 where ip = '';

-- 확인: 빈 문자열 IP 가 0건이어야 정상
select count(*) as empty_ip_rows from public.admin_access_log where ip = '';
