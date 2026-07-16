#!/usr/bin/env bash
# Beautia 보안 회귀 스캐너 — GitHub Actions에서 24/7 자동 실행 (PC/Claude 꺼져도 동작)
# 알려진 위험 패턴이 다시 생기면 CI를 실패시켜 알림. 로컬에서도 `bash security-scan.sh` 로 실행 가능.
set -u
cd "$(dirname "$0")"
FAIL=0
red(){ echo "🔴 [FAIL] $1"; FAIL=1; }
ok(){ echo "✅ [ok] $1"; }

CLIENT="community.html collection.html dashboard.html admin.html"
APIS="$(ls api/*.js 2>/dev/null)"

# 1) service_role / anon 아닌 JWT / sbkey 유출
#    클라이언트 HTML엔 service_role 절대 금지. api/*.js 서버리스는 process.env로 쓰는게 정상이라
#    문자열은 허용하되, 하드코딩된 anon 아닌 키는 아래 JWT-role 디코드 검사($APIS 포함)가 잡음.
if grep -rl "service_role" $CLIENT 2>/dev/null; then red "클라이언트 HTML에 'service_role' 문자열 발견"; else ok "클라이언트 service_role 없음"; fi
for t in $(grep -rhoE "eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{40,}\.[A-Za-z0-9_-]{10,}" $CLIENT $APIS 2>/dev/null | sort -u); do
  role=$(echo "$t" | cut -d. -f2 | tr '_-' '/+' | base64 -d 2>/dev/null | grep -oE '"role":"[a-z_]+"')
  if [ "$role" != '"role":"anon"' ] && [ -n "$role" ]; then red "배포물에 anon 아닌 키($role) 박힘"; fi
done
ok "배포물 JWT role 검사 완료"

# 2) 링크 XSS 회귀: naver/blog가 esc/safeUrl 없이 href에 직접
if grep -nE 'href="\$\{d\.(naver|blog)\}' community.html 2>/dev/null; then red "naver/blog가 esc 없이 href에 직접 삽입(XSS 회귀)"; else ok "naver/blog 링크 안전(safeUrl/esc)"; fi

# 3) 스토리지 업로드가 file.type를 contentType로 신뢰
if grep -nE "contentType:\s*file\.type" dashboard.html 2>/dev/null; then red "업로드가 file.type를 신뢰(임의파일 호스팅 회귀)"; else ok "업로드 content-type 화이트리스트 유지"; fi

# 4) 익명 조회에서 full_name 노출 회귀
if grep -nE "select\('[^']*full_name[^']*'\)\.limit\(300\)" community.html 2>/dev/null; then red "익명 디렉토리 조회에 full_name 재노출"; else ok "full_name 익명 노출 없음"; fi

# 5) 클릭재킹 방어 헤더 유지
if grep -q "frame-ancestors 'none'" vercel.json && grep -q "X-Frame-Options" vercel.json; then ok "클릭재킹 방어 헤더 유지"; else red "CSP frame-ancestors / X-Frame-Options 누락"; fi

# 6) HTML을 출력하는 API 엔드포인트는 반드시 esc()로 이스케이프해야 함 (JSON/XML API는 제외)
for f in $APIS; do
  if grep -q "text/html" "$f" 2>/dev/null; then
    grep -q "const esc" "$f" || red "$f (HTML 출력) 에 esc() 정의 없음(XSS 위험)"
  fi
done
ok "API(HTML출력) esc 규율 검사 완료"

# 7) 시크릿 파일이 추적되는지
if git ls-files 2>/dev/null | grep -qiE "sbkey|\.env$|service_role"; then red "시크릿 파일이 git에 추적됨"; else ok "시크릿 파일 미추적"; fi

# ===== 어드민/대시보드 전용 회귀 검사 =====
# 8) 어드민 오너 이메일 게이트 유지 (게이트 제거 시 누구나 /admin 접근 → 전 디자이너 편집)
if grep -q "OWNER_EMAIL" admin.html 2>/dev/null && grep -qE "!==\s*OWNER_EMAIL|!=\s*OWNER_EMAIL" admin.html 2>/dev/null; then ok "어드민 오너 이메일 게이트 유지"; else red "admin.html 오너 이메일 게이트 제거/약화(무단 접근 회귀)"; fi

# 9) 대시보드/어드민 동적 코드 실행 금지 (eval / new Function = 저장된 데이터로 XSS)
if grep -nE "eval\(|new Function\(" dashboard.html admin.html 2>/dev/null; then red "대시보드/어드민에 eval/new Function 회귀(코드 인젝션 위험)"; else ok "대시보드/어드민 eval/new Function 없음"; fi

# 10) DB 쓰기 스코프: dashboard/admin의 update/delete 는 반드시 .eq() 로 범위 지정 (대량 변경/삭제 방지)
for f in dashboard.html admin.html; do
  bad=$(grep -nE "\.(update|delete)\(" "$f" 2>/dev/null | grep -vE "\.eq\(")
  if [ -n "$bad" ]; then red "$f: 범위(.eq) 없는 update/delete — 대량 변경/삭제 위험"; echo "$bad"; else ok "$f DB 쓰기 스코프(.eq) 유지"; fi
done

# 11) 어드민 후기 삭제가 클라이언트 service_role 이 아닌 RLS(오너 정책)로만 동작하는지 (service_role 은 위 1)에서 이미 차단)
if grep -qE "from\('designer_reviews'\)\.delete\(\)" admin.html 2>/dev/null && ! grep -q "reviews_owner_delete" db_enable_owner_admin.sql 2>/dev/null; then red "어드민 후기삭제 존재하나 오너 삭제 RLS 정책(db_enable_owner_admin.sql) 누락"; else ok "후기 삭제-오너 RLS 정책 정합성 유지"; fi

# ===== 브랜드·지점(shops) / 관리자 MFA 회귀 검사 (2026-07 추가) =====
# 12) 지점 소속 사칭 방지 트리거 유지 (없으면 아무나 유명 브랜드 소속 사칭 가능)
if grep -q "trg_guard_profile_shop" db_shops_security.sql 2>/dev/null && grep -q "guard_profile_shop" db_shops_security.sql 2>/dev/null; then ok "지점 소속 사칭 방지 트리거 유지"; else red "지점 사칭 방지 트리거(guard_profile_shop) 누락"; fi

# 13) join_shop 이 임의 지점 self-가입을 다시 허용하면 사칭 회귀
if grep -qE "set shop_id *= *p_shop *where *id *= *auth.uid" db_shops.sql db_shops_security.sql 2>/dev/null; then red "join_shop이 임의 지점 self-가입 허용(사칭 회귀)"; else ok "join_shop self-가입 차단 유지"; fi

# 14) 지점 생성 남용 제한 트리거 유지
if grep -q "guard_shop_insert" db_shops_security.sql 2>/dev/null; then ok "지점 생성 남용 제한 유지"; else red "지점 생성 제한 트리거(guard_shop_insert) 누락"; fi

# 15) shops 테이블 RLS 활성 유지
if grep -q "alter table public.shops enable row level security" db_shops.sql 2>/dev/null; then ok "shops RLS 유지"; else red "shops 테이블 RLS 비활성/누락"; fi

# 16) 관리자 2단계 인증(MFA) 게이트 유지 (게이트 제거 시 이메일만으로 관리자 접근)
if grep -q "enforceMFA" admin.html 2>/dev/null && grep -qE "await +enforceMFA\(\)" admin.html 2>/dev/null; then ok "관리자 2단계 인증(MFA) 게이트 유지"; else red "admin.html MFA 게이트(enforceMFA) 제거/약화"; fi

# 17) 보안요원(라이브 감시) 유지 — 실시간 침입/새IP 경보 트리거 + 관리자 모니터
if grep -q "trg_guard_admin_access" db_security_guard.sql 2>/dev/null && grep -q "security_alerts" admin.html 2>/dev/null; then ok "보안요원(라이브 감시) 유지"; else red "보안요원 감시(trg_guard_admin_access/security_alerts) 누락"; fi

echo "-----"
if [ "$FAIL" -eq 0 ]; then echo "🛡️ 보안 회귀 없음 — 통과"; else echo "⚠️ 보안 회귀 발견 — 위 [FAIL] 확인 필요"; fi
exit $FAIL
