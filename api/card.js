// Beautia ID 카드 공유 OG 페이지 — /c/<uid>  (vercel.json rewrite로 연결)
// 카톡·라인·X 등에 링크를 붙이면 그 사람의 네컷 ID 카드(저장된 PNG)가 썸네일로 뜨고,
// 사람이 클릭하면 앱 내 공개 프로필(/community?u=<uid>)로 이동한다.
const SB_URL = 'https://pzbxcktaljhesrfnqwzq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Ynhja3RhbGpoZXNyZm5xd3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjc1MjYsImV4cCI6MjA4Mzc0MzUyNn0.aUZbTgfWbjEISNr1-cu9YJnOGj1lzjXeRVifHygAplc';
const SITE = 'https://beautia.io';
const esc = s => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function sb(path) {
  try { const r = await fetch(SB_URL + '/rest/v1/' + path, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } }); return r.ok ? await r.json() : null; } catch (e) { return null; }
}
async function exists(url) {
  try { const r = await fetch(url, { method: 'HEAD' }); return r.ok; } catch (e) { return false; }
}

export default async function handler(req, res) {
  const u = (req.query && req.query.u || '').toString();
  if (!/^[0-9a-fA-F-]{6,}$/.test(u)) { res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(page404()); return; }

  const profs = await sb(`profiles?id=eq.${encodeURIComponent(u)}&select=nickname,role,bio,region,shop`);
  const pr = profs && profs[0];
  if (!pr) { res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(page404()); return; }

  const shop = pr.shop || {};
  const nick = pr.nickname || '회원';
  const cardImg = `${SB_URL}/storage/v1/object/public/beautia/${encodeURIComponent(u)}/card.png`;
  // 저장된 카드가 있으면 그걸, 없으면 아바타/기본 OG로 폴백
  const og = (await exists(cardImg)) ? cardImg : (shop.avatar || `${SITE}/og-default.png`);
  const appUrl = `/community?u=${encodeURIComponent(u)}`;
  const canon = `${SITE}/c/${encodeURIComponent(u)}`;
  const title = `${nick}님의 BEAUTIA ID 카드`;
  const desc = (pr.bio && pr.bio.trim()) ? pr.bio.trim().slice(0, 110) : `${nick}님의 뷰티 ID 카드 — Beautia 한·일 뷰티 커뮤니티에서 프로필·단골 정보 보기`;

  const html = `<!DOCTYPE html><html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${esc(canon)}">
<meta property="og:type" content="profile"><meta property="og:site_name" content="Beautia">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canon)}"><meta property="og:image" content="${esc(og)}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(title)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(og)}">
<link rel="icon" type="image/png" href="/logo-icon.png"><meta name="theme-color" content="#6D4346">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
*{box-sizing:border-box;margin:0;font-family:Pretendard,system-ui,sans-serif}
body{background:#F7F3F1;color:#15110f;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:32px 20px;text-align:center}
.card-img{max-width:280px;width:100%;border-radius:16px;box-shadow:0 24px 60px -22px rgba(20,12,13,.5);border:1px solid #ece7e3}
h1{font-size:20px;font-weight:800;letter-spacing:-.03em;margin-top:22px}
p{font-size:13.5px;color:#8a817b;margin-top:8px;max-width:320px;line-height:1.6}
a.btn{margin-top:22px;display:inline-flex;align-items:center;gap:6px;background:#6D4346;color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:13px 24px;border-radius:999px}
.wm{font-size:11px;letter-spacing:.3em;font-weight:700;color:#bcb4af;margin-bottom:18px}
</style>
</head><body>
<div class="wm">B E A U T I A</div>
<img class="card-img" src="${esc(og)}" alt="${esc(title)}">
<h1>${esc(title)}</h1>
<p>${esc(desc)}</p>
<a class="btn" href="${esc(appUrl)}">프로필 보러가기 →</a>
<script>setTimeout(function(){location.replace(${JSON.stringify(appUrl)});},1200);</script>
</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=600');
  res.status(200).end(html);
}

function page404() {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>카드를 찾을 수 없어요 - Beautia</title><meta name="robots" content="noindex"><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"></head><body style="font-family:Pretendard,sans-serif;text-align:center;padding:80px 20px"><h1 style="font-size:22px">카드를 찾을 수 없어요</h1><p style="margin-top:10px;color:#888">삭제되었거나 없는 프로필일 수 있어요.</p><a style="margin-top:20px;display:inline-block;color:#6D4346;font-weight:700" href="/community">커뮤니티로</a></body></html>`;
}
