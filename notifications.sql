-- Beautia 알림(notifications) — Supabase SQL Editor에서 1회 실행
-- 1) 내 글에 댓글 달리면 작성자에게 알림 (본인 댓글 제외)
-- 2) 관리자가 보내는 공지 알림(user_id=null = 전체 broadcast)

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,  -- 받는 사람 (null = 전체 공지)
  type       text not null default 'comment',                   -- comment | notice
  title      text,
  body       text,
  post_id    uuid references public.posts(id) on delete cascade,
  actor      text,
  read       boolean default false,
  created_at timestamptz default now()
);
create index if not exists notif_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notif_bcast_idx on public.notifications (created_at desc) where user_id is null;

alter table public.notifications enable row level security;

-- 내 알림 + 전체 공지 읽기
drop policy if exists notif_read on public.notifications;
create policy notif_read on public.notifications for select
  using (user_id = auth.uid() or user_id is null);

-- 내 알림 읽음 처리(update)
drop policy if exists notif_update_own on public.notifications;
create policy notif_update_own on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 공지 알림 작성/삭제는 관리자만
drop policy if exists notif_admin_insert on public.notifications;
create policy notif_admin_insert on public.notifications for insert
  with check (public.is_admin());
drop policy if exists notif_admin_delete on public.notifications;
create policy notif_admin_delete on public.notifications for delete
  using (public.is_admin());

-- 댓글 → 글 작성자에게 알림 (security definer: RLS 우회해서 남에게 알림 생성)
create or replace function public.notify_on_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare pa uuid; pt text;
begin
  select author, title into pa, pt from public.posts where id = NEW.post_id;
  if pa is not null and pa <> NEW.author then
    insert into public.notifications (user_id, type, title, body, post_id, actor)
    values (pa, 'comment', coalesce(pt,'내 글'), left(coalesce(NEW.content,''), 80), NEW.post_id, coalesce(NEW.nickname,'누군가'));
  end if;
  return NEW;
end; $$;

drop trigger if exists trg_notify_comment on public.comments;
create trigger trg_notify_comment after insert on public.comments
  for each row execute function public.notify_on_comment();

-- (선택) 공지 보내기 예시:
-- insert into public.notifications (user_id, type, title, body) values (null,'notice','업데이트 소식','BEAUTIA ID 카드 새 기능이 추가됐어요 ✨');
