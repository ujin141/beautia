// Beautia · 푸시 발송 Edge Function (웹푸시 VAPID + iOS 네이티브 APNs)
// 배포:
//   1) supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...   (웹푸시용)
//   2) supabase secrets set APNS_KEY="$(cat AuthKey_XXXXX.p8)" APNS_KEY_ID=XXXXXXXXXX APNS_TEAM_ID=94XAL28D97 APNS_BUNDLE_ID=io.beautia.app   (iOS 네이티브용)
//   3) supabase functions deploy notify
// 클라이언트: SB.functions.invoke('notify',{ body:{ to:<uid>, title, body, url } })  (로그인 JWT 필요)

import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUB = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIV = Deno.env.get("VAPID_PRIVATE_KEY");
const WEBPUSH_ON = !!(VAPID_PUB && VAPID_PRIV);
if (WEBPUSH_ON) {
  // 빈/무효 키로 호출하면 throw → VAPID 설정된 경우에만 초기화
  webpush.setVapidDetails("mailto:hello@beautia.io", VAPID_PUB!, VAPID_PRIV!);
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const J = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

// ───────── APNs (토큰 기반 .p8 JWT) ─────────
function b64url(buf: ArrayBuffer | Uint8Array): string {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const b64urlStr = (s: string) => b64url(new TextEncoder().encode(s));

let _apnsKey: CryptoKey | null = null;
async function apnsKey(): Promise<CryptoKey> {
  if (_apnsKey) return _apnsKey;
  const pem = (Deno.env.get("APNS_KEY") || "")
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  _apnsKey = await crypto.subtle.importKey(
    "pkcs8", der.buffer, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"],
  );
  return _apnsKey;
}
async function apnsJWT(): Promise<string> {
  const header = b64urlStr(JSON.stringify({ alg: "ES256", kid: Deno.env.get("APNS_KEY_ID") }));
  const payload = b64urlStr(JSON.stringify({ iss: Deno.env.get("APNS_TEAM_ID"), iat: Math.floor(Date.now() / 1000) }));
  const key = await apnsKey();
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(header + "." + payload));
  return `${header}.${payload}.${b64url(sig)}`;
}
// ───────── 다국어 알림 템플릿 (수신자 기기 언어로 렌더) ─────────
const NT: Record<"title" | "body", Record<string, Record<string, string>>> = {
  title: {
    bkNew: { ko: "📅 새 예약 요청이 왔어요", en: "📅 New booking request", ja: "📅 新しい予約リクエスト", th: "📅 มีคำขอจองใหม่", zh: "📅 新的预约申请" },
  },
  body: {
    bk_pending:   { ko: "대기중",  en: "Pending",   ja: "承認待ち",   th: "รอดำเนินการ", zh: "待处理" },
    bk_accepted:  { ko: "수락됨",  en: "Accepted",  ja: "承認済み",   th: "ยืนยันแล้ว",  zh: "已接受" },
    bk_declined:  { ko: "거절됨",  en: "Declined",  ja: "お断り",     th: "ปฏิเสธ",      zh: "已拒绝" },
    bk_done:      { ko: "완료",    en: "Completed", ja: "完了",       th: "เสร็จสิ้น",   zh: "已完成" },
    bk_cancelled: { ko: "취소됨",  en: "Cancelled", ja: "キャンセル", th: "ยกเลิก",      zh: "已取消" },
  },
};
function normLang(l?: string): string { return String(l || "").slice(0, 2).toLowerCase(); }
// key가 있고 수신자 언어 템플릿이 있으면 그 언어로, 없으면 전달된 fallback(발신자 언어) 사용
function localized(kind: "title" | "body", key: string | undefined, lang: string, fallback: string): string {
  if (!key) return fallback;
  const m = NT[kind][key];
  if (!m) return fallback;
  return m[lang] || m.en || fallback;
}

async function apnsSend(host: string, token: string, jwt: string, topic: string, payload: object): Promise<number> {
  const res = await fetch(`${host}/3/device/${token}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": topic,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  try { await res.text(); } catch (_e) { /* ignore */ }
  return res.status;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { to, title, body, url, tr } = await req.json();
    if (!to || !/^[0-9a-fA-F-]{30,}$/.test(String(to))) return J({ error: "valid 'to' uid required" }, 400);
    // tr(선택): 수신자 언어 렌더용 키. 값은 고정 템플릿에서만 조회되므로 임의값은 무시됨(주입 안전).
    const titleKey = tr && typeof tr.titleKey === "string" ? tr.titleKey.slice(0, 40) : undefined;
    const bodyKey  = tr && typeof tr.bodyKey  === "string" ? tr.bodyKey.slice(0, 40)  : undefined;

    // === 발신자 인증: 유효한 로그인 사용자만 ===
    const authz = req.headers.get("Authorization") || "";
    const ures = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: authz, apikey: SRK } });
    const caller = ures.ok ? await ures.json() : null;
    const callerId = caller && caller.id;
    if (!callerId) return J({ error: "auth required" }, 401);

    // === 권한: 발신자–대상 사이에 대화 또는 예약 필요 (임의 유저 푸시 스팸/피싱 차단) ===
    const H = { apikey: SRK, Authorization: `Bearer ${SRK}` };
    const rel = `or=(and(customer.eq.${callerId},designer.eq.${to}),and(customer.eq.${to},designer.eq.${callerId}))`;
    let allowed = callerId === String(to);
    if (!allowed) {
      const cv = await fetch(`${SUPABASE_URL}/rest/v1/conversations?select=id&${rel}&limit=1`, { headers: H });
      allowed = cv.ok && ((await cv.json()) as unknown[]).length > 0;
    }
    if (!allowed) {
      const bk = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=id&${rel}&limit=1`, { headers: H });
      allowed = bk.ok && ((await bk.json()) as unknown[]).length > 0;
    }
    if (!allowed) return J({ error: "not authorized to notify this user" }, 403);

    const t = String(title || "Beautia").slice(0, 80);
    const b = String(body || "").slice(0, 180);
    const u = /^\/[\w\-/?=&.%]*$/.test(String(url || "")) ? String(url) : "/community";

    // ───────── 1) 웹푸시 (VAPID / push_subs) — VAPID 설정된 경우만 ─────────
    let sent = 0, subsTotal = 0;
    if (WEBPUSH_ON) try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/push_subs?user_id=eq.${encodeURIComponent(to)}&select=endpoint,sub`, { headers: H });
      const subs: { endpoint: string; sub: object }[] = r.ok ? await r.json() : [];
      subsTotal = subs.length;
      await Promise.all(subs.map((s) =>
        webpush.sendNotification(s.sub as never, JSON.stringify({ title: t, body: b, url: u }))
          .then(() => { sent++; })
          .catch(async (err: { statusCode?: number }) => {
            if (err.statusCode === 404 || err.statusCode === 410) {
              await fetch(`${SUPABASE_URL}/rest/v1/push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: "DELETE", headers: H });
            }
          })
      ));
    } catch (_e) { /* 웹푸시 실패 무시 */ }

    // ───────── 2) iOS 네이티브 APNs (push_tokens) ─────────
    let apnsSent = 0, apnsTotal = 0;
    if (Deno.env.get("APNS_KEY")) {
      try {
        const topic = Deno.env.get("APNS_BUNDLE_ID") || "io.beautia.app";
        // select=* : lang 컬럼이 아직 없어도 에러 없이 동작(있으면 lang 포함)
        const tres = await fetch(`${SUPABASE_URL}/rest/v1/push_tokens?user_id=eq.${encodeURIComponent(to)}&select=*`, { headers: H });
        const toks: { token: string; platform?: string; lang?: string }[] = tres.ok ? await tres.json() : [];
        const iosToks = toks.filter((x) => (x.platform || "ios") === "ios");
        apnsTotal = iosToks.length;
        if (iosToks.length) {
          const jwt = await apnsJWT();
          const PROD = "https://api.push.apple.com", SANDBOX = "https://api.sandbox.push.apple.com";
          await Promise.all(iosToks.map(async (tk) => {
            // 수신자 기기 언어로 렌더(없으면 발신자 언어 fallback)
            const L = normLang(tk.lang);
            const payload = { aps: { alert: { title: localized("title", titleKey, L, t), body: localized("body", bodyKey, L, b) }, sound: "default" }, url: u };
            // 프로덕션 먼저 → BadDeviceToken(400)이면 샌드박스 재시도(개발 빌드 토큰 대응)
            let st = await apnsSend(PROD, tk.token, jwt, topic, payload);
            if (st === 400) st = await apnsSend(SANDBOX, tk.token, jwt, topic, payload);
            if (st === 200) apnsSent++;
            else if (st === 410) { // Unregistered → 만료 토큰 정리
              await fetch(`${SUPABASE_URL}/rest/v1/push_tokens?token=eq.${encodeURIComponent(tk.token)}`, { method: "DELETE", headers: H });
            }
          }));
        }
      } catch (_e) { /* APNs 실패는 웹푸시에 영향 없게 무시 */ }
    }

    return J({ sent, total: subsTotal, apnsSent, apnsTotal });
  } catch (e) {
    return J({ error: String(e) }, 500);
  }
});
