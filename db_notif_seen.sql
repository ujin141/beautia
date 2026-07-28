-- ============================================================
-- 알림 배지가 계속 다시 켜지는 문제 수정
--
-- 증상: 알림(종) 아이콘을 눌러 확인해도, 나중에 빨간 점이 다시 뜬다.
--
-- 원인: '언제 확인했는지'를 브라우저 저장소(localStorage)에만 기록했다.
--   · 사파리는 7일 이상 방문이 없으면 그 사이트 저장소를 통째로 지운다(ITP)
--   · 앱(APK/홈화면 추가)과 브라우저는 저장소가 서로 다르다
--   · 다른 기기·다른 브라우저로 들어가면 기록이 없다
--   기록이 사라지면 '한 번도 확인 안 한 상태'가 되어 배지가 다시 켜진다.
--
-- 해결: 확인 시각을 서버(프로필)에 남긴다. 기기가 바뀌어도 유지된다.
--
-- Supabase → SQL Editor 에서 실행. 여러 번 실행해도 안전.
-- ============================================================

alter table public.profiles
  add column if not exists notif_seen_at timestamptz;

comment on column public.profiles.notif_seen_at is
  '알림 패널을 마지막으로 연 시각. 이 시각 이후에 생긴 알림만 안 읽음으로 센다.';

-- 본인 행만 수정할 수 있어야 한다. 기존 self-update 정책이 있으면 그대로 쓰이고,
-- 없을 때만 만든다(중복 생성 방지).
do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'profiles'
       and cmd = 'UPDATE'
       and qual like '%auth.uid()%'
  ) then
    create policy profiles_self_update on public.profiles
      for update using (auth.uid() = id) with check (auth.uid() = id);
  end if;
end $$;

-- 확인: 컬럼이 생겼는지
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public' and table_name = 'profiles'
   and column_name = 'notif_seen_at';
