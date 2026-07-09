// Beautia · 디자이너 포트폴리오 도착지 페이지 — /d/<uid>  (vercel.json rewrite로 연결)
// 목적: 검색엔진이 "상위 콘텐츠"로 색인할 수 있게, 디자이너의 실제 포트폴리오 사진 + 텍스트 +
//       ImageGallery/ProfilePage 구조화 데이터를 서버에서 완성된 HTML로 렌더한다(리다이렉트 없음).
//       사람이 열면 그대로 읽을 수 있고, "Beautia에서 예약/문의" 버튼으로 앱(/community?u=<uid>)으로 간다.
const SB_URL = 'https://pzbxcktaljhesrfnqwzq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Ynhja3RhbGpoZXNyZm5xd3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjc1MjYsImV4cCI6MjA4Mzc0MzUyNn0.aUZbTgfWbjEISNr1-cu9YJnOGj1lzjXeRVifHygAplc';
const SITE = 'https://beautia.io';

const esc = s => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const jsonld = o => JSON.stringify(o).replace(/</g, '\\u003c');

async function sb(path) {
  try {
    const r = await fetch(SB_URL + '/rest/v1/' + path, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } });
    return r.ok ? await r.json() : null;
  } catch (e) { return null; }
}

// 표기 언어 추정: 가나(일본어) > 한글(한국어) > 그 외 영어
function pickLang(str) {
  const s = String(str || '');
  if (/[぀-ヿ]/.test(s)) return 'ja';
  if (/[가-힣]/.test(s)) return 'ko';
  return 'en';
}
const L = {
  ko: { designer: '뷰티 디자이너', portfolio: '포트폴리오', career: '경력', spec: '전문 분야', book: 'Beautia에서 예약·문의', insta: '인스타그램 보기', blog: '블로그', naver: '네이버 예약', more: '다른 디자이너', home: '홈', work: '작업', worksIn: '지역', by: '작업', locale: 'ko_KR', htmllang: 'ko' },
  ja: { designer: 'ビューティーデザイナー', portfolio: 'ポートフォリオ', career: '経歴', spec: '専門', book: 'Beautiaで予約・問い合わせ', insta: 'Instagramを見る', blog: 'ブログ', naver: 'NAVER', more: '他のデザイナー', home: 'ホーム', work: '作品', worksIn: 'エリア', by: '作品', locale: 'ja_JP', htmllang: 'ja' },
  en: { designer: 'Beauty designer', portfolio: 'Portfolio', career: 'Experience', spec: 'Specialties', book: 'Book / message on Beautia', insta: 'View on Instagram', blog: 'Blog', naver: 'NAVER', more: 'More designers', home: 'Home', work: 'work', worksIn: 'Area', by: 'work', locale: 'en_US', htmllang: 'en' },
};

// OG는 항상 영어로 — 전문분야·도시를 영어로 매핑(디자이너 상호명은 고유명사라 유지)
const CATMAP_EN = { '속눈썹': 'Lash', '속눈썹펌': 'Lash perm', '래쉬': 'Lash', '래쉬리프트': 'Lash lift', '네일': 'Nail', '젤네일': 'Gel nail', '네일아트': 'Nail art', '헤어': 'Hair', '헤어컷': 'Hair', '펌': 'Perm', '염색': 'Color', '메이크업': 'Makeup', '메이크': 'Makeup', '스킨': 'Skin', '피부': 'Skin', '브라이덜': 'Bridal', '왁싱': 'Waxing', '케라틴': 'Keratin', '타투': 'Tattoo', '문신': 'Tattoo', '레터링': 'Lettering tattoo' };
const CITYMAP_EN = { '서울': 'Seoul', '부산': 'Busan', '대구': 'Daegu', '인천': 'Incheon', '광주': 'Gwangju', '광명': 'Gwangmyeong', '김포': 'Gimpo', '분당': 'Bundang', '성남': 'Seongnam', '서현': 'Seohyun', '수원': 'Suwon', '오사카': 'Osaka', '大阪府': 'Osaka', '도쿄': 'Tokyo', '東京': 'Tokyo', '교토': 'Kyoto' };
const engCat = s => CATMAP_EN[String(s || '').trim()] || String(s || '').trim();
const engCity = s => { s = String(s || '').trim(); return CITYMAP_EN[s] || s; };

const igClean = s => String(s || '').trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '');
const VIDRE = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;
// 작업 목록(영상/이미지) — 영상은 poster를 별도로 보관
const workList = shop => (Array.isArray(shop && shop.photos) ? shop.photos : [])
  .map(p => (p && typeof p === 'object') ? { src: p.img, poster: p.poster } : { src: p, poster: '' })
  .filter(w => typeof w.src === 'string' && w.src.startsWith('http'))
  .map(w => ({ src: w.src, poster: (typeof w.poster === 'string' && w.poster.startsWith('http')) ? w.poster : '', vid: VIDRE.test(w.src) }));
// SEO/OG용 대표 이미지 URL: 영상이면 포스터(없으면 제외), 이미지는 자신
const imgOf = w => (w.vid ? w.poster : w.src);

export default async function handler(req, res) {
  const u = (req.query && req.query.u || '').toString();
  if (!/^[0-9a-fA-F-]{6,}$/.test(u)) { res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(page404()); return; }

  const profs = await sb(`profiles?id=eq.${encodeURIComponent(u)}&select=id,nickname,role,bio,region,shop`);
  const pr = profs && profs[0];
  if (!pr) { res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(page404()); return; }

  const shop = pr.shop || {};
  const name = (shop.name && shop.name.trim()) || pr.nickname || 'Beautia designer';
  const city = (pr.region || shop.area || '').toString().trim();
  const cityEN = engCity(city);
  const specs = Array.isArray(shop.specialties) ? shop.specialties.filter(Boolean) : [];
  const specText = specs.map(engCat).join(' · ');
  const career = (shop.career || '').toString().trim();
  const bio = (pr.bio || '').toString().trim();
  const ig = igClean(shop.insta);
  const blog = (typeof shop.blog === 'string' && /^https?:\/\//i.test(shop.blog)) ? shop.blog : '';
  const naver = (typeof shop.naver === 'string' && /^https?:\/\//i.test(shop.naver)) ? shop.naver : '';
  const works = workList(shop);
  const imgs = works.map(imgOf).filter(Boolean);   // 이미지 URL만(영상은 포스터)
  const avatar = (typeof shop.avatar === 'string' && shop.avatar.startsWith('http')) ? shop.avatar : '';
  const t = L.en;   // OG는 항상 영어

  const canon = `${SITE}/d/${encodeURIComponent(u)}`;
  const appUrl = `/community?u=${encodeURIComponent(u)}`;
  const heroImg = imgs[0] || avatar || `${SITE}/og-cover.png`;
  const titleBits = [name, specText, cityEN].filter(Boolean);
  const title = `${titleBits.join(' · ')} | Beautia`;
  const desc = `${name} — ${specText ? specText + ' ' : ''}${t.designer}${cityEN ? ' · ' + cityEN : ''}. Browse the portfolio and book on Beautia.`.slice(0, 155);

  // 다른 디자이너(내부 링크 그래프) — 최대 8명
  const others = (await sb(`profiles?role=eq.designer&id=neq.${encodeURIComponent(u)}&select=id,nickname,region,shop&limit=8`)) || [];

  // ── 구조화 데이터 ─────────────────────────────────────────────
  const person = {
    '@type': 'Person', '@id': canon + '#person', name,
    jobTitle: specText ? `${specText} ${t.designer}` : t.designer,
    image: heroImg, url: canon,
  };
  if (bio) person.description = bio;
  if (specs.length) person.knowsAbout = specs;
  if (city) person.areaServed = city;
  const sameAs = [];
  if (ig) sameAs.push(`https://instagram.com/${ig}`);
  if (blog) sameAs.push(blog);
  if (naver) sameAs.push(naver);
  if (sameAs.length) person.sameAs = sameAs;
  if (career) person.award = career;

  const graph = [
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: t.home, item: `${SITE}/community` },
      { '@type': 'ListItem', position: 2, name, item: canon },
    ] },
    { '@type': 'ProfilePage', '@id': canon, url: canon, name: title,
      inLanguage: t.htmllang, isPartOf: { '@id': `${SITE}/#website` }, mainEntity: person },
  ];
  if (imgs.length) {
    graph.push({
      '@type': 'ImageGallery', name: `${name} — ${t.portfolio}`, url: canon,
      image: imgs.map((src, i) => ({
        '@type': 'ImageObject', contentUrl: src, url: src,
        name: `${name} ${specText || t.designer} ${t.by} ${i + 1}${city ? ' · ' + city : ''}`,
        caption: `${name} — ${specText || t.designer}${city ? ' · ' + city : ''} | Beautia`,
        creator: { '@type': 'Person', name },
        creditText: `${name} · Beautia`,
        copyrightNotice: `© ${name} · Beautia`,
        license: `${SITE}/terms.html`,
        acquireLicensePage: canon,
      })),
    });
  }
  const ld = { '@context': 'https://schema.org', '@graph': graph };

  // ── 갤러리 마크업 ─────────────────────────────────────────────
  const gallery = works.map((w, i) => {
    const altTxt = esc(`${name} — ${specText || t.designer} ${t.by} ${i + 1}${city ? ' · ' + city : ''} | Beautia`);
    if (w.vid) {
      return `<figure class="w vid"><video controls preload="none" playsinline${w.poster ? ` poster="${esc(w.poster)}"` : ''}><source src="${esc(w.src)}" type="video/mp4"></video></figure>`;
    }
    return `<figure class="w"><img src="${esc(w.src)}" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async" alt="${altTxt}"></figure>`;
  }).join('');

  const chips = specs.map(s => `<span class="chip">${esc(s)}</span>`).join('');
  const moreLinks = others.map(o => {
    const os = o.shop || {}; const on = (os.name && os.name.trim()) || o.nickname || 'designer';
    const oc = (o.region || os.area || '').toString().trim();
    const osp = (Array.isArray(os.specialties) ? os.specialties : []).join(' · ');
    return `<a class="more-card" href="/d/${esc(o.id)}"><b>${esc(on)}</b><span>${esc([osp, oc].filter(Boolean).join(' · '))}</span></a>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="${t.htmllang}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<link rel="canonical" href="${esc(canon)}">
<meta property="og:type" content="profile"><meta property="og:site_name" content="Beautia">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canon)}"><meta property="og:image" content="${esc(heroImg)}">
<meta property="og:image:alt" content="${esc(name + ' — ' + (specText || t.designer))}"><meta property="og:locale" content="${t.locale}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(heroImg)}">
<link rel="icon" type="image/png" href="/favicon.png"><meta name="theme-color" content="#ffffff">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<script type="application/ld+json">${jsonld(ld)}</script>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:Pretendard,'Malgun Gothic',system-ui,sans-serif}
:root{--ink:#1c1418;--sub:#8a817b;--line:#efeae8;--soft:#f7f3f1;--plum:#6E4A50}
body{background:#fff;color:var(--ink);-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
.wrap{max-width:940px;margin:0 auto;padding:0 20px 80px}
header.top{border-bottom:1px solid var(--line)}
.top .in{max-width:940px;margin:0 auto;padding:16px 20px;display:flex;align-items:center;gap:8px}
.top .b{font-weight:800;font-size:20px;color:var(--plum);letter-spacing:-.02em}
nav.bc{font-size:12.5px;color:var(--sub);padding:16px 0 4px}
nav.bc a:hover{color:var(--plum)}
.hero{display:flex;gap:22px;align-items:flex-end;padding:14px 0 22px;border-bottom:1px solid var(--line);flex-wrap:wrap}
.hero .av{width:96px;height:96px;border-radius:24px;object-fit:cover;background:var(--soft);border:1px solid var(--line)}
.hero h1{font-size:30px;letter-spacing:-.03em;line-height:1.15}
.hero .role{color:var(--plum);font-weight:700;font-size:15px;margin-top:6px}
.hero .meta{color:var(--sub);font-size:13.5px;margin-top:6px;display:flex;gap:14px;flex-wrap:wrap}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.chip{background:var(--soft);border:1px solid var(--line);border-radius:999px;padding:7px 14px;font-size:13px;font-weight:600}
.bio{margin:20px 0 4px;font-size:15px;line-height:1.75;color:#4a4046;max-width:680px;white-space:pre-wrap}
.cta{display:inline-flex;align-items:center;gap:7px;margin:22px 0 6px;background:var(--plum);color:#fff;font-weight:800;font-size:15px;padding:14px 26px;border-radius:999px}
.cta.ghost{background:#fff;color:var(--plum);border:1.5px solid var(--plum);margin-left:10px}
h2.sec{font-size:19px;letter-spacing:-.02em;margin:38px 0 16px}
.gal{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.gal .w{margin:0;border-radius:18px;overflow:hidden;background:var(--soft);aspect-ratio:4/5}
.gal .w img{width:100%;height:100%;object-fit:cover}
.gal .w video{width:100%;height:100%;object-fit:cover;display:block;background:#000}
.more{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:14px}
.more-card{border:1px solid var(--line);border-radius:16px;padding:16px 18px;display:flex;flex-direction:column;gap:4px}
.more-card:hover{border-color:var(--plum)}
.more-card b{font-size:15px}.more-card span{font-size:12.5px;color:var(--sub)}
footer{border-top:1px solid var(--line);margin-top:56px;padding:28px 0;color:var(--sub);font-size:12.5px;text-align:center}
@media(max-width:640px){.gal{grid-template-columns:repeat(2,1fr)}.more{grid-template-columns:1fr}.hero h1{font-size:24px}}
</style>
</head><body>
<header class="top"><div class="in"><a href="/community" class="b">Beautia</a></div></header>
<div class="wrap">
<nav class="bc"><a href="/community">${esc(t.home)}</a> · <span>${esc(name)}</span></nav>
<section class="hero">
  ${avatar ? `<img class="av" src="${esc(avatar)}" alt="${esc(name)}" loading="eager" decoding="async">` : ''}
  <div>
    <h1>${esc(name)}</h1>
    <div class="role">${esc(specText ? specText + ' · ' + t.designer : t.designer)}</div>
    <div class="meta">${city ? `<span>📍 ${esc(city)}</span>` : ''}${career ? `<span>${esc(t.career)}: ${esc(career)}</span>` : ''}${ig ? `<a href="https://instagram.com/${esc(ig)}" rel="me nofollow" target="_blank">@${esc(ig)}</a>` : ''}${blog ? `<a href="${esc(blog)}" rel="me nofollow" target="_blank">${esc(t.blog)}</a>` : ''}${naver ? `<a href="${esc(naver)}" rel="me nofollow" target="_blank">${esc(t.naver)}</a>` : ''}</div>
  </div>
</section>
${chips ? `<div class="chips">${chips}</div>` : ''}
${bio ? `<p class="bio">${esc(bio)}</p>` : ''}
<div><a class="cta" href="${esc(appUrl)}">${esc(t.book)} →</a>${ig ? `<a class="cta ghost" href="https://instagram.com/${esc(ig)}" rel="nofollow" target="_blank">${esc(t.insta)}</a>` : ''}</div>
${works.length ? `<h2 class="sec">${esc(t.portfolio)}</h2><div class="gal">${gallery}</div>` : ''}
${moreLinks ? `<h2 class="sec">${esc(t.more)}</h2><div class="more">${moreLinks}</div>` : ''}
<footer>© Beautia — <a href="/community">beautia.io</a></footer>
</div>
</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
  res.status(200).end(html);
}

function page404() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Designer not found — Beautia</title><meta name="robots" content="noindex"><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"></head><body style="font-family:Pretendard,sans-serif;text-align:center;padding:80px 20px"><h1 style="font-size:22px">Designer not found</h1><p style="margin-top:10px;color:#888">This profile may have been removed.</p><a style="margin-top:20px;display:inline-block;color:#6E4A50;font-weight:700" href="/community">Browse designers →</a></body></html>`;
}
