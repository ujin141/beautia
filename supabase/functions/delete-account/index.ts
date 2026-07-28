// Beautia · 인앱 계정 삭제 (App Store Guideline 5.1.1(v))
// 로그인한 본인이 호출 → 인증 계정 삭제(모든 앱 데이터 FK CASCADE 연쇄삭제) + 스토리지 파일 정리.
// 추가 단계(재로그인·비밀번호·이메일) 없이 즉시 완료.
// 배포: supabase functions deploy delete-account
// 클라이언트: SB.functions.invoke('delete-account')  (로그인 JWT 필요)

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    // 호출자 = 로그인 본인만
    const authz = req.headers.get("Authorization") || "";
    const ures = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: authz, apikey: SRK } });
    const caller = ures.ok ? await ures.json() : null;
    const uid = caller && caller.id;
    if (!uid || !/^[0-9a-fA-F-]{30,}$/.test(String(uid))) return J({ error: "auth required" }, 401);

    const admin = { apikey: SRK, Authorization: `Bearer ${SRK}` };

    // 1) 스토리지 파일 정리(best-effort) — beautia 버킷의 {uid}/ 이하 전부 삭제
    try {
      const lr = await fetch(`${SUPABASE_URL}/storage/v1/object/list/beautia`, {
        method: "POST",
        headers: { ...admin, "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: `${uid}/`, limit: 1000 }),
      });
      const objs: { name: string }[] = lr.ok ? await lr.json() : [];
      const paths = (objs || []).map((o) => `${uid}/${o.name}`);
      if (paths.length) {
        await fetch(`${SUPABASE_URL}/storage/v1/object/beautia`, {
          method: "DELETE",
          headers: { ...admin, "Content-Type": "application/json" },
          body: JSON.stringify({ prefixes: paths }),
        });
      }
    } catch (_e) { /* 스토리지 정리 실패는 계정 삭제를 막지 않음 */ }

    // 2) 인증 계정 삭제 → 모든 앱 데이터 FK CASCADE 연쇄삭제(profiles/bookings/coupons/messages/…)
    const del = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: admin });
    if (!del.ok) {
      const t = await del.text().catch(() => "");
      return J({ error: "delete failed", detail: t.slice(0, 300) }, 500);
    }
    return J({ ok: true });
  } catch (e) {
    return J({ error: String(e) }, 500);
  }
});
