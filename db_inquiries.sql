-- Beautia · 고객 문의(Contact/문의하기) 테이블
-- Supabase → SQL Editor 에 붙여넣고 1회 실행하세요. (어드민 "문의" 탭 + 사이트 문의 버튼용)

create table if not exists public.inquiries (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  uid        uuid,                        -- 로그인 시 사용자 id(선택)
  name       text,                        -- 이름/닉네임(선택)
  contact    text,                        -- 이메일/전화/인스타 등(선택)
  message    text not null,               -- 문의 내용
  page       text,                        -- 문의한 위치(경로)
  lang       text,                        -- 언어
  status     text not null default 'new'  -- new / read / done
);
create index if not exists inquiries_created_idx on public.inquiries (created_at desc);
-- 스팸/폭주 완화: 본문 길이 제한(2000자)
alter table public.inquiries add constraint inquiries_msg_len check (char_length(message) <= 2000) not valid;

alter table public.inquiries enable row level security;

-- 제출: 누구나 삽입만 (조회/수정/삭제 불가)
drop policy if exists inq_insert on public.inquiries;
create policy inq_insert on public.inquiries
  for insert to anon, authenticated with check (char_length(message) between 1 and 2000);

-- 조회: 오너(로그인)만
drop policy if exists inq_owner_select on public.inquiries;
create policy inq_owner_select on public.inquiries
  for select to authenticated
  using ((auth.jwt() ->> 'email') = 'ujin141@naver.com');

-- 상태 변경(처리 표시): 오너만
drop policy if exists inq_owner_update on public.inquiries;
create policy inq_owner_update on public.inquiries
  for update to authenticated
  using ((auth.jwt() ->> 'email') = 'ujin141@naver.com')
  with check ((auth.jwt() ->> 'email') = 'ujin141@naver.com');
