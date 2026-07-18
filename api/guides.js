// Beautia · 가이드 목록 — /guides  (vercel.json rewrite)
import { GUIDES, ORDER } from './guide.js';
const SITE = 'https://beautia.io';
const esc = s => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const jsonld = o => JSON.stringify(o).replace(/</g, '\\u003c');

export default async function handler(req, res) {
  const canon = `${SITE}/guides`;
  const items = ORDER.map((slug, i) => ({ slug, ...GUIDES[slug], pos: i + 1 }));
  const ld = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'CollectionPage', '@id': canon + '#page', name: 'Beautia Guides', description: 'Korean salon menus, perms, lashes and semi-permanent brows — explained in English, with real prices from designers on Beautia.', url: canon, inLanguage: 'en' },
      { '@type': 'ItemList', itemListElement: items.map(it => ({ '@type': 'ListItem', position: it.pos, url: `${SITE}/guide/${it.slug}`, name: it.title })) },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Beautia', item: SITE + '/community' },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: canon },
      ] },
    ],
  };
  const cards = items.map(it => `<a class="card" href="/guide/${it.slug}">
    <span class="cat">${esc(it.catLabel || 'Guide')}</span>
    <h2>${esc(it.title)}</h2>
    <p>${esc(it.desc)}</p>
    <span class="more">${it.read} min read →</span></a>`).join('');

  const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Korean Beauty Guides — Salon Menus, Perms, Lashes, Brows | Beautia</title>
<meta name="description" content="What Korean salon menus actually say, what a perm or semi-permanent brows really cost in Seoul, and how to pick a designer when you cannot read the reviews.">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<link rel="canonical" href="${esc(canon)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Beautia">
<meta property="og:title" content="Korean Beauty Guides | Beautia"><meta property="og:description" content="Korean salon menus, perms, lashes and brows — explained in English, with real prices.">
<meta property="og:url" content="${esc(canon)}"><meta property="og:image" content="${SITE}/og-cover.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.png" type="image/png"><meta name="theme-color" content="#6E4A50">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,500&display=swap">
<script type="application/ld+json">${jsonld(ld)}</script>
<style>
:root{--plum:#6E4A50;--cream:#F7F2F1;--ink:#1C1418;--sub:#736c64;--line:#ece6e4}
*{box-sizing:border-box;margin:0}body{font-family:Pretendard,system-ui,sans-serif;color:var(--ink);background:#fff;line-height:1.6;-webkit-font-smoothing:antialiased}
header.top{border-bottom:1px solid var(--line);position:sticky;top:0;background:rgba(255,255,255,.94);backdrop-filter:blur(10px);z-index:5}
.wrap{max-width:760px;margin:0 auto;padding:0 20px}
.top .wrap{display:flex;align-items:center;gap:9px;height:58px}
.top img{height:30px}.top b{font-family:Fraunces,serif;font-style:italic;font-size:22px;color:var(--plum);font-weight:500}
.hero{padding:34px 0 8px}.hero h1{font-size:30px;font-weight:800;letter-spacing:-.03em}.hero p{color:var(--sub);margin-top:8px;font-size:15px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:22px 0 10px}
@media(max-width:620px){.grid{grid-template-columns:1fr}}
.card{display:block;text-decoration:none;color:var(--ink);border:1px solid var(--line);border-radius:18px;padding:20px;transition:.15s}
.card:hover{border-color:var(--plum);transform:translateY(-2px)}
.cat{display:inline-block;font-size:11.5px;font-weight:800;color:var(--plum);background:#f5e9ec;padding:4px 11px;border-radius:999px}
.card h2{font-size:18px;font-weight:800;letter-spacing:-.022em;margin:12px 0 8px;line-height:1.35}
.card p{font-size:14px;color:var(--sub);line-height:1.6}
.card .more{display:block;margin-top:12px;font-size:13px;font-weight:800;color:var(--plum)}
footer{border-top:1px solid var(--line);margin-top:30px;padding:26px 0;font-size:12.5px;color:var(--sub)}
footer a{color:var(--sub);text-decoration:none;margin-right:14px}
</style></head><body>
<header class="top"><div class="wrap"><a href="/community" style="display:flex;align-items:center;gap:9px;text-decoration:none"><img src="/logo-mark.png" alt="Beautia"><b>Beautia</b></a></div></header>
<div class="wrap">
<div class="hero"><h1>Guides</h1><p>What the menu says, what it costs, and how to pick the right person — for anyone getting beauty work done in Korea without speaking Korean.</p></div>
<div class="grid">${cards}</div>
</div>
<footer><div class="wrap"><a href="/community">Home</a><a href="/designers">Designers</a><a href="/guides">Guides</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a><div style="margin-top:10px">© Beautia · Your style, found.</div></div></footer>
</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).end(html);
}
