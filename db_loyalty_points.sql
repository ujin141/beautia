-- Beautia · 재방문 로열티 — 예약 완료 시 자동 포인트 적립 (Supabase SQL Editor에서 1회 실행)
-- 사전조건: add-points.sql (profiles.points·point_ledger·sync_points 트리거) 이미 실행됨.
-- 안전: 적립은 이 SECURITY DEFINER 트리거로만(클라 직접 point_ledger INSERT 는 RLS로 차단됨).
--       상태를 done 으로 바꾸는 건 디자이너/오너만 가능(bookings RLS) → 고객이 스스로 적립 불가.
-- 멱등(여러 번 실행 안전). akey 로 예약당 1회만 적립(중복·되돌림 재적립 방지).

create or replace function public.award_booking_points()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- 예약이 '완료(done)'로 전환될 때, 실제 고객(디자이너 셀프예약 제외)에게 500P 1회 적립
  if NEW.status = 'done'
     and coalesce(OLD.status,'') is distinct from 'done'
     and NEW.customer is not null
     and NEW.customer <> NEW.designer then
    insert into public.point_ledger(user_id, akey, amount, reason)
      values (NEW.customer, 'booking:'||NEW.id::text, 500, '예약 완료 적립')
      on conflict do nothing;   -- point_ledger_user_akey unique → 예약당 1회
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_award_booking_points on public.bookings;
create trigger trg_award_booking_points after update on public.bookings
  for each row execute function public.award_booking_points();

-- 참고: 적립액(500)은 이 함수 한 곳에서 조정. 향후 시술가 %·등급별 배수·redeem(포인트→쿠폰) 확장 예정.
