// Beautia · 후기 요청 링크 만들기 (디자이너 전용)
//
// 왜 Edge Function 인가: 토큰은 그걸 쥔 사람이 후기를 쓸 수 있는 열쇠다.
// 클라이언트에서 만들면 아무 값이나 넣어 만들 수 있으므로 서버에서만 발급한다.
//
// 흐름: 디자이너가 대시보드에서 누른다 → 1회용 토큰 발급 → 링크를 돌려준다.
//       디자이너가 그 링크를 손님에게 카톡·DM 으로 보낸다.
//
// 배포: supabase functions deploy review-invite-create
// 클라이언트: SB.functions.invoke('review-invite-create', { body: { label } })

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE = "https://beautia.io";

// 하루에 만들 수 있는 개수. 손님에게 하나씩 보내는 용도라 이 정도면 넉넉하고,
// 계정이 털렸을 때 무한 발급으로 이어지지 않는다.
const DAILY_MAX = 40;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const J = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

// 추측할 수 없는 22자 토큰(base64url, 128비트)
function newToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authz = req.headers.get("Authorization") || "";
    const ures = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: authz, apikey: SRK } });
    const caller = ures.ok ? await ures.json() : null;
    if (!caller || !caller.id) return J({ error: "로그인이 필요합니다" }, 401);
    const uid = caller.id as string;

    const admin = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };

    // 디자이너만. 손님 계정이 자기 앞으로 후기를 만들 수 없게 한다.
    const pr = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}&select=role`, { headers: admin });
    const prof = pr.ok ? (await pr.json())[0] : null;
    if (!prof || prof.role !== "designer") return J({ error: "디자이너만 만들 수 있습니다" }, 403);

    // 하루 발급 상한
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const cnt = await fetch(
      `${SUPABASE_URL}/rest/v1/review_invites?designer=eq.${uid}&created_at=gte.${since}&select=token`,
      { headers: { ...admin, Prefer: "count=exact", Range: "0-0" } });
    const total = Number((cnt.headers.get("content-range") || "*/0").split("/")[1] || 0);
    if (total >= DAILY_MAX) return J({ error: `하루 ${DAILY_MAX}개까지 만들 수 있어요. 내일 다시 시도해 주세요.` }, 429);

    const body = await req.json().catch(() => ({}));
    const label = String(body.label || "").trim().slice(0, 60);

    const token = newToken();
    const ins = await fetch(`${SUPABASE_URL}/rest/v1/review_invites`, {
      method: "POST", headers: { ...admin, Prefer: "return=minimal" },
      body: JSON.stringify({ token, designer: uid, label: label || null }),
    });
    if (!ins.ok) return J({ error: "링크 생성 실패", detail: (await ins.text()).slice(0, 200) }, 500);

    return J({ ok: true, token, url: `${SITE}/review?t=${token}` });
  } catch (e) {
    return J({ error: String(e) }, 500);
  }
});
