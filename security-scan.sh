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
if grep -rl "service_role" $CLIENT $APIS 2>/dev/null; then red "클라이언트/그에 'service_role' 문자열 발견"; else ok "service_role 문자열 없음"; fi
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

echo "-----"
if [ "$FAIL" -eq 0 ]; then echo "🛡️ 보안 회귀 없음 — 통과"; else echo "⚠️ 보안 회귀 발견 — 위 [FAIL] 확인 필요"; fi
exit $FAIL
