// Beautia · 어드민에서 디자이너 대신 등록 (오너 전용)
//
// 왜 Edge Function 인가: 계정 생성은 service_role 이 필요한데, 그 키를 어드민 페이지
// (클라이언트, anon 키)에 넣으면 노출된다. 그래서 서버측 함수에서만 처리한다.
// delete-account 와 같은 패턴이다.
//
// 흐름: 어드민이 사진을 자기 폴더에 올려 URL 을 만든 뒤, 폼 값과 함께 이 함수를 호출한다.
//   1) 호출자가 오너인지 검증
//   2) 임시 auth 계정 생성(email_confirm: true → 즉시 활성)
//   3) profiles 에 role=designer + shop 통째로 insert
//   4) 임시 이메일·비밀번호·주소를 돌려준다(어드민이 디자이너에게 전달)
//
// 배포: supabase functions deploy admin-create-designer
// 클라이언트: SB.functions.invoke('admin-create-designer', { body: {...} })

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OWNER_EMAIL = "ujin141@naver.com";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const J = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

// ── slug 생성 (api/_seo.js 와 같은 규칙) ─────────────────────
const CITYMAP: Record<string, string> = {
  "서울": "seoul", "부산": "busan", "대구": "daegu", "인천": "incheon", "광주": "gwangju",
  "대전": "daejeon", "울산": "ulsan", "광명": "gwangmyeong", "김포": "gimpo", "분당": "bundang",
  "성남": "seongnam", "수원": "suwon", "용인": "yongin", "일산": "ilsan", "창원": "changwon",
  "청담": "cheongdam", "강남": "gangnam", "신사": "sinsa", "홍대": "hongdae", "성수": "seongsu",
  "의정부": "uijeongbu", "고양": "goyang", "안양": "anyang", "부천": "bucheon", "전주": "jeonju",
  "제주": "jeju", "천안": "cheonan", "평택": "pyeongtaek",
  "오사카": "osaka", "도쿄": "tokyo", "교토": "kyoto", "후쿠오카": "fukuoka",
  "치앙마이": "chiang-mai", "방콕": "bangkok", "푸켓": "phuket", "파타야": "pattaya",
};
const CATMAP: Record<string, string> = {
  "속눈썹": "lash", "속눈썹펌": "lash", "네일": "nail", "헤어": "hair", "헤어컷": "hair",
  "메이크업": "makeup", "브라이덜": "makeup", "타투": "tattoo", "스킨": "skin",
  "반영구 눈썹": "semi-permanent-brows", "반영구 메이크업": "semi-permanent-makeup",
};
const slugify = (s: string) =>
  String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");
const igClean = (s: string) =>
  String(s || "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, "");

function makeSlug(region: string, spec: string, name: string, insta: string): string {
  const city = CITYMAP[String(region || "").trim()] || slugify(region);
  const cat = CATMAP[String(spec || "").trim()] || slugify(spec);
  const who = slugify(igClean(insta)) || slugify(name) || Math.random().toString(36).slice(2, 8);
  return [city, cat, who].filter(Boolean).join("-");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    // ── 1) 오너 검증 ──────────────────────────────────────
    const authz = req.headers.get("Authorization") || "";
    const ures = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: authz, apikey: SRK } });
    const caller = ures.ok ? await ures.json() : null;
    const email = (caller && caller.email || "").toLowerCase();
    if (!caller || !caller.id) return J({ error: "auth required" }, 401);
    if (email !== OWNER_EMAIL) return J({ error: "owner only" }, 403);

    const admin = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };
    const b = await req.json().catch(() => ({}));

    const name = String(b.name || "").trim();
    if (!name) return J({ error: "이름(상호)이 필요합니다" }, 400);
    const region = String(b.region || "").trim();
    const specialties: string[] = Array.isArray(b.specialties) ? b.specialties.filter(Boolean) : [];
    if (!specialties.length) return J({ error: "전문 분야가 필요합니다" }, 400);

    // ── 2) 임시 계정 생성 ─────────────────────────────────
    const rnd = () => crypto.getRandomValues(new Uint8Array(9)).reduce((a, x) => a + x.toString(36), "").slice(0, 12);
    const tmpEmail = slugify(igClean(b.insta) || name || "designer").slice(0, 20) + "-" + rnd().slice(0, 6) + "@beautia.io";
    const password = rnd() + rnd().slice(0, 4).toUpperCase();

    const cu = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST", headers: admin,
      body: JSON.stringify({ email: tmpEmail, password, email_confirm: true,
        user_metadata: { name, shop: name } }),
    });
    if (!cu.ok) return J({ error: "계정 생성 실패", detail: (await cu.text()).slice(0, 240) }, 500);
    const uid = (await cu.json()).id;

    // ── 3) 프로필 insert ─────────────────────────────────
    const slug = String(b.slug || "").trim() || makeSlug(region, specialties[0], name, b.insta || "");
    const shop = {
      name, area: String(b.area || "").trim(), address: String(b.address || "").trim(),
      city: region, country: String(b.country || "KR").trim().toUpperCase(),
      avatar: String(b.avatar || ""), career: String(b.career || "").trim(),
      specialties, tags: Array.isArray(b.tags) ? b.tags.filter(Boolean) : [],
      photos: Array.isArray(b.photos) ? b.photos.filter(Boolean) : [],
      services: Array.isArray(b.services) ? b.services : [],
      cur: String(b.cur || "KRW").trim().toUpperCase(),
      insta: igClean(b.insta || ""), naver: String(b.naver || "").trim(),
      bookingUrl: String(b.bookingUrl || "").trim(), bookMode: "app", slug, hidden: false,
    };
    if (b.sns && typeof b.sns === "object") (shop as Record<string, unknown>).sns = b.sns;

    const ins = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: "POST", headers: { ...admin, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ id: uid, nickname: name, role: "designer",
        region, bio: String(b.bio || "").trim(), shop }),
    });
    if (!ins.ok) {
      // 프로필 실패하면 방금 만든 계정을 되돌린다(고아 계정 방지)
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: admin }).catch(() => {});
      return J({ error: "프로필 생성 실패", detail: (await ins.text()).slice(0, 240) }, 500);
    }

    return J({ ok: true, uid, email: tmpEmail, password, slug,
      url: `https://beautia.io/d/${slug}` });
  } catch (e) {
    return J({ error: String(e) }, 500);
  }
});
