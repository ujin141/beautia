// Beautia · 디자이너 목록 허브 — /designers  (vercel.json rewrite로 연결)
//
// 왜 있나: 디자이너 도착지 페이지 19개가 전부 "고아 페이지"였다. 사이트맵에만 있고
// 어디서도 링크가 안 걸려 있어서 구글이 색인을 안 했다(30일 구글 유입 5건).
// 실제로 색인된 건 주소에 단어가 들어간 /guide/... 뿐이었다.
//
// 이 페이지가 그 입구다. 서버에서 완성된 HTML로 19명 전원에게 링크를 걸고,
// 도시·시술별로 묶어서 "hair salon in Seoul" 같은 검색어를 본문에 실제로 담는다.
const SB_URL = 'https://pzbxcktaljhesrfnqwzq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Ynhja3RhbGpoZXNyZm5xd3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjc1MjYsImV4cCI6MjA4Mzc0MzUyNn0.aUZbTgfWbjEISNr1-cu9YJnOGj1lzjXeRVifHygAplc';
const SITE = 'https://beautia.io';

import { makeSlug, searchPhrase, placeText, engCity, engCat, countryEN } from './_seo.js';

const esc = s => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const jsonld = o => JSON.stringify(o).replace(/</g, '\\u003c');

const VIDRE = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;
// 목록 썸네일 — 영상이면 포스터, 없으면 아바타
function thumbOf(shop) {
  const ps = Array.isArray(shop && shop.photos) ? shop.photos : [];
  for (const p of ps) {
    const src = (p && typeof p === 'object') ? p.img : p;
    const poster = (p && typeof p === 'object') ? p.poster : '';
    if (typeof src !== 'string' || !src.startsWith('http')) continue;
    if (VIDRE.test(src)) { if (typeof poster === 'string' && poster.startsWith('http')) return poster; continue; }
    return src;
  }
  return (typeof shop.avatar === 'string' && shop.avatar.startsWith('http')) ? shop.avatar : '';
}

export default async function handler(req, res) {
  let rows = [];
  try {
    const r = await fetch(`${SB_URL}/rest/v1/profiles?role=eq.designer&select=id,nickname,region,bio,shop`, {
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY },
    });
    if (r.ok) rows = await r.json();
  } catch (e) { rows = []; }

  const items = rows.map(p => {
    const shop = p.shop || {};
    const specs = (Array.isArray(shop.specialties) ? shop.specialties : []).filter(Boolean);
    return {
      id: p.id,
      slug: makeSlug(p),
      name: (p.nickname && p.nickname.trim()) || (shop.name && shop.name.trim()) || 'Beautia designer',
      phrase: searchPhrase(specs) || 'Beauty Designer',
      cats: specs.map(engCat).filter(Boolean),
      city: engCity(p.region || shop.area || ''),
      place: placeText(p.region, shop),
      country: countryEN(shop.country) || '',
      thumb: thumbOf(shop),
      works: (Array.isArray(shop.photos) ? shop.photos : []).length,
      priced: (Array.isArray(shop.services) ? shop.services : []).length > 0,
    };
  }).filter(x => x.slug);

  // 도시 정렬 규칙. 디자이너가 많은 순, 같으면 여행지로 알려진 곳 순.
  // 앞자리에 Seoul·Osaka·Chiang Mai 처럼 아는 이름이 와야 읽는 사람이 "내가 가는 데구나" 하고 멈춘다.
  // Gwangmyeong 이나 Changwon 이 먼저 나오면 그냥 지나간다.
  const KNOWN = ['Seoul', 'Osaka', 'Tokyo', 'Chiang Mai', 'Bangkok', 'Busan', 'Kyoto'];
  const fame = c => { const i = KNOWN.indexOf(c); return i < 0 ? 99 : i; };
  const cityCount = {};
  items.forEach(x => { if (x.city) cityCount[x.city] = (cityCount[x.city] || 0) + 1; });
  const cityRank = (a, b) => (cityCount[b] || 0) - (cityCount[a] || 0) || fame(a) - fame(b) || a.localeCompare(b);

  // 나라 → 도시 순으로 묶는다. 사람이 찾기도 쉽고, 그 제목들이 그대로 검색어가 된다.
  const byCountry = {};
  items.forEach(x => { (byCountry[x.country || 'Other'] = byCountry[x.country || 'Other'] || []).push(x); });
  const COUNTRY_ORDER = ['South Korea', 'Japan', 'Thailand', 'United States'];
  const countries = Object.keys(byCountry).sort((a, b) => {
    const ia = COUNTRY_ORDER.indexOf(a), ib = COUNTRY_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });

  const card = x => `<a class="c" href="/d/${esc(x.slug)}">
  <div class="ph">${x.thumb ? `<img src="${esc(x.thumb)}" loading="lazy" decoding="async" alt="${esc(`${x.name} — ${x.phrase}${x.place ? ' in ' + x.place : ''} | Beautia`)}">` : ''}</div>
  <div class="tx"><b>${esc(x.name)}</b><span>${esc(x.phrase)}${x.place ? ' · ' + esc(x.place) : ''}</span>
  <em>${x.works} ${x.works === 1 ? 'photo' : 'photos'}${x.priced ? ' · prices listed' : ''}</em></div></a>`;

  const sections = countries.map(cn => {
    // 카드도 아는 도시부터. Seoul 디자이너가 맨 앞에 와야 한다.
    const list = byCountry[cn].slice().sort((a, b) =>
      cityRank(a.city || '', b.city || '') || a.name.localeCompare(b.name));
    // 그 나라에서 실제로 되는 시술 — 본문에 검색어를 담는 자리
    const cats = [...new Set(list.map(x => x.phrase))].join(', ');
    const cities = [...new Set(list.map(x => x.city).filter(Boolean))].sort(cityRank).join(', ');
    return `<section class="grp">
  <h2 id="${esc(cn.toLowerCase().replace(/[^a-z]+/g, '-'))}">Beauty designers in ${esc(cn)}</h2>
  <p class="lead">${esc(`${list.length} ${list.length === 1 ? 'designer' : 'designers'}${cities ? ' in ' + cities : ''}. ${cats}. Browse real portfolio photos and book in English.`)}</p>
  <div class="grid">${list.map(card).join('')}</div>
</section>`;
  }).join('');

  const totalCities = Object.keys(cityCount).sort(cityRank);
  const catCount = {};
  items.forEach(x => { catCount[x.phrase] = (catCount[x.phrase] || 0) + 1; });
  const totalCats = Object.keys(catCount).sort((a, b) => catCount[b] - catCount[a] || a.localeCompare(b));
  const title = `Korean & Asian Beauty Designers — Book in English | Beautia`;
  const desc = `Browse ${items.length} beauty designers in ${totalCities.slice(0, 4).join(', ')} and more. Real portfolio photos, prices, and booking in English.`.slice(0, 155);
  const canon = `${SITE}/designers`;

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/community` },
        { '@type': 'ListItem', position: 2, name: 'Designers', item: canon },
      ] },
      { '@type': 'CollectionPage', '@id': canon, url: canon, name: title, description: desc, inLanguage: 'en',
        mainEntity: {
          '@type': 'ItemList', numberOfItems: items.length,
          itemListElement: items.map((x, i) => ({
            '@type': 'ListItem', position: i + 1, url: `${SITE}/d/${x.slug}`, name: `${x.name} — ${x.phrase}${x.place ? ' in ' + x.place : ''}`,
          })),
        } },
    ],
  };

  const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<link rel="canonical" href="${esc(canon)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Beautia">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canon)}"><meta property="og:image" content="${SITE}/og-cover.png">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${SITE}/og-cover.png">
<link rel="icon" type="image/png" href="/favicon.png"><meta name="theme-color" content="#ffffff">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<script type="application/ld+json">${jsonld(ld)}</script>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:Pretendard,'Malgun Gothic',system-ui,sans-serif}
:root{--ink:#1c1418;--sub:#736c64;--line:#efeae8;--soft:#f7f3f1;--plum:#6E4A50}
body{background:#fff;color:var(--ink);-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
.wrap{max-width:1000px;margin:0 auto;padding:0 20px 80px}
header.top{border-bottom:1px solid var(--line)}
.top .in{max-width:1000px;margin:0 auto;padding:16px 20px;display:flex;align-items:center;gap:8px}
.top .b{font-weight:800;font-size:20px;color:var(--plum);letter-spacing:-.02em}
nav.bc{font-size:12.5px;color:var(--sub);padding:16px 0 4px}
nav.bc a:hover{color:var(--plum)}
h1{font-size:32px;letter-spacing:-.03em;line-height:1.2;margin:10px 0 12px;max-width:720px}
.intro{color:#4a4046;font-size:15.5px;line-height:1.75;max-width:680px;margin-bottom:8px}
.grp{margin-top:46px}
.grp h2{font-size:21px;letter-spacing:-.025em;scroll-margin-top:20px}
.lead{color:var(--sub);font-size:13.5px;margin:8px 0 18px;max-width:720px;line-height:1.6}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.c{border:1px solid var(--line);border-radius:18px;overflow:hidden;display:flex;flex-direction:column;transition:border-color .16s,transform .16s}
.c:hover{border-color:var(--plum);transform:translateY(-2px)}
.c .ph{aspect-ratio:4/5;background:var(--soft)}
.c .ph img{width:100%;height:100%;object-fit:cover;display:block}
.c .tx{padding:12px 14px 14px;display:flex;flex-direction:column;gap:3px}
.c .tx b{font-size:14.5px;letter-spacing:-.02em}
.c .tx span{font-size:12.5px;color:var(--plum);font-weight:600;letter-spacing:-.022em}
.c .tx em{font-size:11.5px;color:var(--sub);font-style:normal}
.cta{display:inline-flex;align-items:center;gap:7px;margin:18px 0 6px;background:var(--plum);color:#fff;font-weight:800;font-size:15px;padding:14px 26px;border-radius:999px}
footer{border-top:1px solid var(--line);margin-top:60px;padding:28px 0;color:var(--sub);font-size:12.5px;text-align:center;line-height:1.9}
footer a:hover{color:var(--plum)}
@media(max-width:860px){.grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:640px){.grid{grid-template-columns:repeat(2,1fr);gap:12px}h1{font-size:25px}}
</style>
</head><body>
<header class="top"><div class="in"><a href="/community" class="b">Beautia</a></div></header>
<div class="wrap">
<nav class="bc"><a href="/community">Home</a> · <span>Designers</span></nav>
<h1>Beauty designers you can book in English</h1>
<p class="intro">Every designer here has a real portfolio — actual work they did, not stock photos. Pick by the photos, not by a review you can't read. ${esc(totalCats.slice(0, 5).join(', '))} and more, across ${esc(totalCities.slice(0, 5).join(', '))}.</p>
<a class="cta" href="/community">Open the app →</a>
${sections}
<footer><a href="/community">Home</a> · <a href="/guides">Guides</a> · <a href="/community">beautia.io</a><br>© Beautia — Your style, found.</footer>
</div>
</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
  res.status(200).end(html);
}
