// Beautia · 웹푸시 발송 Edge Function
// 배포:
//   1) supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...   (Desktop/Beautia/push-vapid-keys.txt 참고)
//   2) supabase functions deploy notify
// 클라이언트: SB.functions.invoke('notify',{ body:{ to:<uid>, title, body, url } })  (로그인 JWT 필요)

import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
webpush.setVapidDetails(
  "mailto:hello@beautia.io",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const J = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { to, title, body, url } = await req.json();
    if (!to || !/^[0-9a-fA-F-]{30,}$/.test(String(to))) return J({ error: "valid 'to' uid required" }, 400);

    // === 발신자 인증: 유효한 로그인 사용자만 (익명/미인증 푸시 발송 차단) ===
    const authz = req.headers.get("Authorization") || "";
    const ures = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: authz, apikey: SRK } });
    const caller = ures.ok ? await ures.json() : null;
    const callerId = caller && caller.id;
    if (!callerId) return J({ error: "auth required" }, 401);

    // === 권한: 발신자와 대상 사이에 대화 또는 예약이 있어야 발송 허용 (임의 유저 푸시 스팸/피싱 차단) ===
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

    const r = await fetch(`${SUPABASE_URL}/rest/v1/push_subs?user_id=eq.${encodeURIComponent(to)}&select=endpoint,sub`, {
      headers: { apikey: SRK, Authorization: `Bearer ${SRK}` },
    });
    const subs: { endpoint: string; sub: object }[] = r.ok ? await r.json() : [];
    let sent = 0;
    await Promise.all(subs.map((s) =>
      webpush.sendNotification(s.sub as never, JSON.stringify({ title: t, body: b, url: u }))
        .then(() => { sent++; })
        .catch(async (err: { statusCode?: number }) => {
          if (err.statusCode === 404 || err.statusCode === 410) { // 만료 구독 정리
            await fetch(`${SUPABASE_URL}/rest/v1/push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, {
              method: "DELETE", headers: { apikey: SRK, Authorization: `Bearer ${SRK}` },
            });
          }
        })
    ));
    return J({ sent, total: subs.length });
  } catch (e) {
    return J({ error: String(e) }, 500);
  }
});
