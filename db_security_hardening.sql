-- ============================================================
-- Beautia · 보안 강화 마이그레이션 (Red/Blue 라운드 3 대응)
-- Supabase → SQL Editor → 붙여넣기 → Run.  여러 번 실행해도 안전.
-- 목적: (1) 허위 리뷰(평판 테러) 차단  (2) 셀프 평점 조작 차단  (3) 예약 스팸/DoS 완화
-- ============================================================

-- ========== 1) 예약 삽입 정책 ==========
--  · 손님 예약: 본인이 고객이고, 디자이너와 다르며, 무조건 'pending' 으로 시작
--    (고객이 처음부터 status='done' 로 넣어 리뷰 자격을 스스로 만드는 것 차단)
--  · 디자이너 수기/외부 예약: 디자이너 본인이 자기 캘린더에 등록 (customer=designer 자리표시 허용)
drop policy if exists bk_insert on public.bookings;
create policy bk_insert on public.bookings for insert
  with check (
    (auth.uid() = customer and customer <> designer and coalesce(status,'pending') = 'pending')
    or (auth.uid() = designer)
  );

-- ========== 2) 예약 상태 변경: 고객은 '취소'만, 완료·수락·거절은 디자이너만 ==========
--  (고객이 자기 예약을 스스로 'done' 처리 → 허위 리뷰 다는 경로 차단)
drop policy if exists bk_update on public.bookings;
create policy bk_update on public.bookings for update
  using (auth.uid() = customer or auth.uid() = designer)
  with check (
    (auth.uid() = designer)                                   -- 디자이너: 모든 상태 전환
    or (auth.uid() = customer and status = 'cancelled')       -- 고객: 취소만
  );

-- ========== 3) 리뷰 작성: 실제 손님이, 완료된, 본인≠디자이너 예약에만 ==========
--  (customer <> designer 조건으로 '디자이너 셀프 예약→셀프 5점' 평점 조작 차단)
drop policy if exists drv_insert on public.designer_reviews;
create policy drv_insert on public.designer_reviews for insert
  with check (
    auth.uid() = customer
    and customer <> designer
    and exists (
      select 1 from public.bookings b
      where b.id = booking
        and b.customer = auth.uid()
        and b.designer = designer
        and b.customer <> b.designer      -- 자리표시(수기/외부) 예약은 리뷰 불가
        and b.status = 'done'
    )
  );

-- ========== 4) 예약 스팸/캘린더 도배(DoS) 완화 ==========
--  같은 고객이 같은 디자이너·날짜·시간을 중복 예약 방지 + 하루 생성 개수 제한(봇 도배 방지)
create unique index if not exists bookings_no_dup
  on public.bookings(customer, designer, date, time)
  where time is not null and time <> '';

create or replace function public.bk_ratelimit()
returns trigger language plpgsql security definer as $$
declare cnt int;
begin
  select count(*) into cnt from public.bookings
    where customer = new.customer and created_at > now() - interval '1 day';
  if cnt >= 30 then
    raise exception 'booking rate limit exceeded (max 30/day per user)';
  end if;
  return new;
end;
$$;

drop trigger if exists bk_ratelimit_trg on public.bookings;
create trigger bk_ratelimit_trg before insert on public.bookings
  for each row execute function public.bk_ratelimit();

-- 완료!
--  ✔ 고객은 예약을 스스로 완료 처리 못 함 → 허위 리뷰 차단
--  ✔ 디자이너 셀프 예약은 리뷰 대상 아님 → 평점 조작 차단
--  ✔ 중복·대량 예약 스팸 제한
--  ✔ 대시보드 수기 예약(디자이너 본인)은 그대로 동작
