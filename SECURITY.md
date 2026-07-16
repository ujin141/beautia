# Beautia 보안 운영 런북 (Security Runbook)

> 마켓플레이스는 남의 데이터를 위탁받는 곳이라 보안이 신뢰의 핵심.
> 이 문서는 **반복 실행하는 보안 점검 루틴**이다. (상세 태세는 `보안/Beautia_보안_태세_진단서.pdf`)

## 점검 주기 (Cadence)

| 주기 | 할 일 | 방법 |
|---|---|---|
| **매일 (빠른)** | 관리자 접속기록에 낯선 IP/거부 없나 | /admin → 접속기록 탭 |
| **주 1회** | 보안 자가진단 SQL 실행 (결과 0줄이어야 정상) | 아래 §1 |
| **DDL 변경 후 즉시** | 새 테이블 RLS·권한 점검 + 자가진단 재실행 | §1 + Supabase Advisors |
| **배포 전** | 새 코드의 사용자 입력 출력에 `esc()` 썼나, 시크릿 안 박혔나 | §2 |
| **대형 제휴/결제 전** | 외부 침투테스트 + 개인정보 법률 검토 | 외부 전문가 |

## §1. 보안 자가진단 (주 1회 · DDL 후)

Supabase → SQL Editor 에서 **`db_security_audit.sql`** 실행.
**결과가 한 줄도 없어야 정상.** 나오면 그 항목을 조치:

- `RLS_DISABLED` → 해당 테이블에 `alter table ... enable row level security;` + 정책 추가
- `RLS_NO_POLICY` → 정책이 없어 전부 막힘/열림 — 의도 확인 후 정책 작성
- `DEFINER_NO_SEARCHPATH` → 함수에 `set search_path = public` 추가 (인젝션 방지)
- `ANON_WRITE_GRANT` → anon 롤의 쓰기권한 회수 (`revoke insert,update,delete ... from anon`)
- `VIEW_EXPOSES_AUTH` → auth.users 노출 뷰 제거/권한 회수
- 마지막 `SHOP_GUARD_OK` 는 **1행 나와야 정상** (사칭 방지 트리거 설치 확인)

또한 **Supabase 대시보드 → Database → Advisors (Security)** 를 함께 확인. (권장 자동 점검)

## §2. 배포 전 코드 체크 (30초)

- [ ] 사용자 입력을 화면에 넣을 때 `esc()` 이스케이프 했나 (XSS)
- [ ] service_role 키·비밀번호·토큰이 코드/커밋에 없나 (`git diff` 확인, `.gitignore` 유지)
- [ ] 외부 CDN 스크립트엔 무결성(SRI) 있나 / 자체호스팅 우선
- [ ] 새 Supabase 쿼리가 RLS로 보호되나 (anon 키로 접근 가정)

## §3. 계정/접근 보안

- 관리자(/admin)는 **2단계 인증(TOTP) 필수** — 최초 로그인 시 인증 앱(Google Authenticator 등) 등록.
  - 사전조건: Supabase → Authentication → **MFA(TOTP) 활성화**.
- (선택·강화) DB 레벨에서도 관리자 작업에 `aal2` 요구하려면 owner 정책에 MFA 조건 추가 —
  **단, MFA 등록·정상 동작 확인 후** 적용할 것 (미등록 상태에서 걸면 잠금 위험).

## 최근 하드닝 로그

- 2026-07: 지점 소속 **사칭 방지 트리거**(`guard_profile_shop`) + self-가입 금지
- 2026-07: **지점 생성 남용 제한**(계정당 30개 상한) `guard_shop_insert`
- 2026-07: 관리자 **2단계 인증(TOTP)** 도입
- 2026-07: 아이콘 폰트 **자체호스팅**(CDN 의존·무결성 리스크 축소)
- (이전) 레거시 테이블 RLS·auth.users 노출 뷰 정리, 쿠폰 무한재귀 수정, 예약 웹훅 하드닝

## 사고 대응 (요약)

1. 유출/침해 의심 → 즉시 **service_role 키 회전**(Supabase → Settings → API → reset) + 영향 범위 파악
2. 관리자 세션 전체 로그아웃, 비밀번호/MFA 재설정
3. 접속기록(admin_access_log)·로그 보존, 원인 분석
4. 개인정보 유출 시 **법적 통지 의무**(PIPA) — 법률 자문 필수
