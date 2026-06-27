// Beautia 글 SSR 페이지 (SEO/GEO/AEO) — /p/<id>  (vercel.json rewrite로 연결)
// 각 글을 서버에서 HTML로 렌더 → 검색엔진·AI가 제목/본문/댓글을 그대로 읽음
const SB_URL = 'https://pzbxcktaljhesrfnqwzq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Ynhja3RhbGpoZXNyZm5xd3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjc1MjYsImV4cCI6MjA4Mzc0MzUyNn0.aUZbTgfWbjEISNr1-cu9YJnOGj1lzjXeRVifHygAplc';
const SITE = 'https://beautia.io';
const esc = s => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const REGJA = { '서울':'ソウル','부산':'釜山','대구':'大邱','인천':'仁川','한국 기타':'韓国その他','도쿄':'東京','오사카':'大阪','교토':'京都','후쿠오카':'福岡','삿포로':'札幌','나고야':'名古屋','일본 기타':'日本その他' };
const flag = r => (['서울','부산','대구','인천','한국 기타'].includes(r) ? '🇰🇷' : (['도쿄','오사카','교토','후쿠오카','삿포로','나고야','일본 기타'].includes(r) ? '🇯🇵' : ''));

async function sb(path) {
  try { const r = await fetch(SB_URL + '/rest/v1/' + path, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } }); return r.ok ? await r.json() : null; } catch (e) { return null; }
}

export default async function handler(req, res) {
  const id = (req.query && req.query.id || '').toString();
  if (!/^[0-9a-fA-F-]{6,}$/.test(id)) { res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(page404()); return; }

  const rows = await sb(`posts?id=eq.${encodeURIComponent(id)}&hidden=eq.false&select=*`);
  const p = rows && rows[0];
  if (!p) { res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(page404()); return; }

  const profs = p.author ? await sb(`profiles?id=eq.${p.author}&select=nickname,role,shop`) : null;
  const author = (profs && profs[0]) || {};
  const nick = author.nickname || p.nickname || '익명';
  const comments = await sb(`comments?post_id=eq.${encodeURIComponent(id)}&select=nickname,content,created_at&order=created_at.asc`) || [];

  const canon = `${SITE}/p/${id}`;
  const region = p.region && p.region !== '전체' ? p.region : '';
  const cat = p.cat || '자유';
  const plain = (p.content || '').replace(/\s+/g, ' ').trim();
  const title = `${p.title} ${region ? '| ' + region + ' ' : '| '}${cat} - Beautia 커뮤니티`;
  const desc = (plain.slice(0, 150) || `${region} ${cat} - Beautia 한·일 뷰티 커뮤니티`) + (plain.length > 150 ? '…' : '');
  const ogimg = (p.imgs && p.imgs.length) ? p.imgs[0] : `${SITE}/logo.png`;
  const created = p.created_at || new Date().toISOString();

  // JSON-LD (AEO)
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Beautia 커뮤니티", "item": `${SITE}/community` },
      { "@type": "ListItem", "position": 2, "name": cat, "item": `${SITE}/community?cat=${encodeURIComponent(cat)}` },
      { "@type": "ListItem", "position": 3, "name": p.title, "item": canon } ] },
    { "@context": "https://schema.org", "@type": "DiscussionForumPosting", "headline": p.title, "articleBody": p.content || '',
      "url": canon, "datePublished": created, "author": { "@type": "Person", "name": nick },
      "image": (p.imgs && p.imgs.length) ? p.imgs : undefined,
      "interactionStatistic": [
        { "@type": "InteractionCounter", "interactionType": "https://schema.org/LikeAction", "userInteractionCount": p.like_count || 0 },
        { "@type": "InteractionCounter", "interactionType": "https://schema.org/CommentAction", "userInteractionCount": comments.length } ],
      "comment": comments.slice(0, 20).map(c => ({ "@type": "Comment", "text": c.content, "author": { "@type": "Person", "name": c.nickname || '익명' }, "dateCreated": c.created_at })) }
  ];
  if (cat === '질문') {
    ld.push({ "@context": "https://schema.org", "@type": "QAPage", "mainEntity": {
      "@type": "Question", "name": p.title, "text": p.content || '', "answerCount": comments.length, "dateCreated": created, "author": { "@type": "Person", "name": nick },
      "acceptedAnswer": comments.length ? { "@type": "Answer", "text": comments[0].content, "author": { "@type": "Person", "name": comments[0].nickname || '익명' } } : undefined,
      "suggestedAnswer": comments.slice(1, 10).map(c => ({ "@type": "Answer", "text": c.content, "author": { "@type": "Person", "name": c.nickname || '익명' } })) } });
  }

  const imgsHtml = (p.imgs && p.imgs.length) ? `<div class="dgal">${p.imgs.map(s => `<img src="${esc(s)}" alt="${esc(p.title)} 사진" loading="lazy">`).join('')}</div>` : '';
  const tagsHtml = (p.tags && p.tags.length) ? `<div class="ptags">${p.tags.map(tg => `<span>#${esc(tg)}</span>`).join('')}</div>` : '';
  const cmtHtml = comments.length ? comments.map(c => `<div class="cm"><b>${esc(c.nickname || '익명')}</b><p>${esc(c.content)}</p></div>`).join('') : `<p class="muted">아직 댓글이 없어요. 첫 댓글을 남겨보세요.</p>`;
  const dateStr = new Date(created).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  const html = `<!DOCTYPE html><html lang="ko"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<link rel="canonical" href="${canon}">
<link rel="alternate" hreflang="ko" href="${canon}"><link rel="alternate" hreflang="x-default" href="${canon}">
<meta property="og:type" content="article"><meta property="og:site_name" content="Beautia">
<meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canon}"><meta property="og:image" content="${esc(ogimg)}">
<meta property="article:published_time" content="${created}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(p.title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(ogimg)}">
<link rel="icon" type="image/png" href="/logo-icon.png"><meta name="theme-color" content="#6D4346">
<meta name="naver-site-verification" content="bec0ee3bfd015beb74d81bfea16300eb57e61afd">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="/info.css">
${ld.map(j => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
<style>
.pwrap{max-width:720px;margin:0 auto;padding:0 22px 70px;}
.pmeta{font-size:13px;color:var(--sub);margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
.pcat{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--plum);}
.pbody{font-size:16.5px;line-height:1.9;color:var(--ink);margin-top:22px;white-space:pre-wrap;word-break:break-word;}
.dgal{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-top:20px;}
.dgal img{width:100%;border-radius:12px;border:1px solid var(--line2);display:block;}
.ptags{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px;}.ptags span{font-size:12.5px;color:var(--plum);background:var(--plumbg);padding:5px 12px;border-radius:999px;}
.psec{margin-top:34px;padding-top:22px;border-top:1px solid var(--line);}
.psec h2{font-size:17px;font-weight:800;letter-spacing:-.02em;margin-bottom:12px;}
.cm{padding:13px 0;border-top:1px solid var(--line2);}.cm:first-of-type{border-top:none;}.cm b{font-size:13.5px;}.cm p{font-size:14.5px;color:var(--ink2);margin-top:5px;line-height:1.6;white-space:pre-wrap;}
.pcta{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px;}
</style>
</head><body>
<header class="hdr"><div class="hwrap">
  <a class="logo" href="/community"><img src="/logo-trim.png" alt="Beautia"></a>
  <nav class="gnav"><a href="/community">커뮤니티</a><a href="/info">지역 정보</a><a href="/shop">입점 샵</a></nav>
  <a class="btn btn-primary hcta" href="/community?post=${id}">앱에서 보기</a>
</div></header>
<div class="pwrap">
  <div class="crumb"><a href="/community">커뮤니티</a><span class="sep">›</span><a href="/community?cat=${encodeURIComponent(cat)}">${esc(cat)}</a><span class="sep">›</span><span>${esc(p.title)}</span></div>
  <article>
    <div class="pcat">${esc(cat)}</div>
    <h1 style="font-size:30px;font-weight:800;letter-spacing:-.035em;line-height:1.25;margin-top:10px">${esc(p.title)}</h1>
    <div class="pmeta"><b>${esc(nick)}</b>${region ? `<span>· ${flag(region)} ${esc(region)}</span>` : ''}<span>· ${dateStr}</span><span>· ♥ ${p.like_count || 0}</span><span>· 💬 ${comments.length}</span></div>
    ${imgsHtml}
    <div class="pbody">${esc(p.content || '')}</div>
    ${tagsHtml}
    <div class="pcta">
      <a class="btn btn-primary" href="/community?post=${id}">💬 댓글 보기·쓰기 (Beautia)</a>
      <a class="btn btn-kakao" href="https://pf.kakao.com/_xhxhixfX/chat" target="_blank">카톡으로 예약</a>
    </div>
  </article>
  <section class="psec"><h2>댓글 ${comments.length}</h2>${cmtHtml}</section>
  <section class="psec"><h2>이 글은 Beautia 커뮤니티의 글이에요</h2>
    <p class="muted" style="font-size:14px;line-height:1.7">일본 미용실·네일을 한국어로 예약·통역 대행하는 Beautia. 일본어를 못해도 한국어로 신청하면 예약·통역까지 대행해드려요(예약 대행 무료). ／ 韓国語で日本の美容室・ネイルを予約・通訳代行。</p>
    <div class="pcta"><a class="btn btn-ghost" href="/community">커뮤니티 더 보기</a><a class="btn btn-ghost" href="/info">지역별 후기·가격</a></div>
  </section>
</div>
<footer><div class="fwrap"><a href="/community">커뮤니티</a><a href="/info">지역 정보</a><a href="/shop">입점 샵</a><a href="/privacy">개인정보</a><a href="/terms">약관</a><span class="cp">© 2026 Beautia</span></div></footer>
</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
  res.status(200).end(html);
}

function page404() {
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>글을 찾을 수 없어요 - Beautia</title><meta name="robots" content="noindex"><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"><link rel="stylesheet" href="/info.css"></head><body><div class="wrap" style="text-align:center;padding:80px 20px"><h1 style="font-size:22px">글을 찾을 수 없어요</h1><p class="muted" style="margin-top:10px">삭제되었거나 비공개 글일 수 있어요.</p><a class="btn btn-primary" style="margin-top:20px;display:inline-flex" href="/community">커뮤니티로</a></div></body></html>`;
}
