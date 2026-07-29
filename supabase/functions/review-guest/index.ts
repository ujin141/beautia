// Beautia · 초대 링크로 받는 후기 (손님용, 로그인 없음)
//
// 왜 Edge Function 인가: 익명 클라이언트에 designer_reviews insert 를 열면
// 토큰을 쥔 사람이 여러 개를 밀어넣거나, used_at 을 세우기 전에 경합으로
// 여러 번 통과시킬 수 있다. 검증 → 저장 → 사용처리를 서버에서 한 번에 한다.
//
// action:
//   info   { t }                     → 누구에게 쓰는 후기인지(이름·사진) 돌려준다
//   submit { t, stars, body, name }  → 후기를 저장하고 토큰을 소진한다
//
// 배포: supabase functions deploy review-guest
//   손님은 로그인하지 않지만 페이지가 공개 anon 키를 Authorization 에 실어 보내므로
//   기본 JWT 검증을 그대로 켜둔다(--no-verify-jwt 필요 없음). 실제 권한 검사는 토큰이 한다.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const J = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const admin = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };

// 토큰은 우리가 발급한 base64url 22자다. 그 형태가 아니면 조회조차 하지 않는다.
const okToken = (s: string) => /^[A-Za-z0-9_-]{16,64}$/.test(s);

async function getInvite(t: string) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/review_invites?token=eq.${encodeURIComponent(t)}&select=token,designer,used_at,expires_at`,
    { headers: admin });
  if (!r.ok) return null;
  return (await r.json())[0] || null;
}

async function designerCard(uid: string) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}&select=nickname,shop`, { headers: admin });
  const p = r.ok ? (await r.json())[0] : null;
  if (!p) return null;
  const shop = (p.shop || {}) as Record<string, unknown>;
  return {
    name: String(shop.name || p.nickname || ""),
    avatar: String(shop.avatar || ""),
    area: String(shop.area || shop.city || ""),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const b = await req.json().catch(() => ({}));
    const t = String(b.t || "").trim();
    if (!okToken(t)) return J({ error: "invalid" }, 400);

    const inv = await getInvite(t);
    if (!inv) return J({ error: "링크를 찾을 수 없어요." }, 404);
    if (inv.used_at) return J({ error: "이미 후기를 남긴 링크예요.", used: true }, 409);
    if (new Date(inv.expires_at).getTime() < Date.now()) return J({ error: "만료된 링크예요.", expired: true }, 410);

    const who = await designerCard(inv.designer);
    if (!who) return J({ error: "링크를 찾을 수 없어요." }, 404);

    if (b.action === "info") return J({ ok: true, designer: who });

    if (b.action !== "submit") return J({ error: "invalid action" }, 400);

    const stars = Math.round(Number(b.stars));
    if (!(stars >= 1 && stars <= 5)) return J({ error: "별점을 선택해 주세요." }, 400);
    const body = String(b.body || "").trim().slice(0, 1000);
    const name = String(b.name || "").trim().slice(0, 24);
    if (body.length < 5) return J({ error: "후기를 조금만 더 적어주세요." }, 400);

    // 저장 — invite 에 unique index 가 걸려 있어 동시에 두 번 들어와도 하나만 남는다.
    const ins = await fetch(`${SUPABASE_URL}/rest/v1/designer_reviews`, {
      method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify({
        designer: inv.designer, stars, body: body || null,
        invite: t, author_name: name || null,
      }),
    });
    if (!ins.ok) {
      const detail = (await ins.text()).slice(0, 200);
      // unique 위반 = 이미 이 링크로 후기가 들어갔다는 뜻
      if (/duplicate key|drv_invite_uidx/i.test(detail)) return J({ error: "이미 후기를 남긴 링크예요.", used: true }, 409);
      return J({ error: "저장 실패", detail }, 500);
    }

    // 토큰 소진. 후기는 이미 저장됐으므로 여기서 실패해도 unique index 가 재사용을 막는다.
    await fetch(`${SUPABASE_URL}/rest/v1/review_invites?token=eq.${encodeURIComponent(t)}`, {
      method: "PATCH", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify({ used_at: new Date().toISOString() }),
    }).catch(() => {});

    return J({ ok: true, designer: who });
  } catch (e) {
    return J({ error: String(e) }, 500);
  }
});
