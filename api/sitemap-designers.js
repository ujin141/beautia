// Beautia · 디자이너 포트폴리오 동적 이미지 사이트맵 — /sitemap-designers.xml (vercel.json rewrite)
// 모든 디자이너의 /d/<uid> 도착지 페이지 + 각 포트폴리오 사진을 image:image 로 노출한다.
// 새 디자이너가 가입/사진을 올리면 재빌드 없이 자동 반영된다.
const SB_URL = 'https://pzbxcktaljhesrfnqwzq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Ynhja3RhbGpoZXNyZm5xd3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjc1MjYsImV4cCI6MjA4Mzc0MzUyNn0.aUZbTgfWbjEISNr1-cu9YJnOGj1lzjXeRVifHygAplc';
const SITE = 'https://beautia.io';
const esc = s => (s == null ? '' : String(s)).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

const photoUrls = shop => (Array.isArray(shop && shop.photos) ? shop.photos : [])
  .map(p => (p && typeof p === 'object') ? p.img : p)
  .filter(x => typeof x === 'string' && x.startsWith('http'));

export default async function handler(req, res) {
  let rows = [];
  try {
    const r = await fetch(`${SB_URL}/rest/v1/profiles?role=eq.designer&select=id,nickname,region,shop`, {
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY },
    });
    if (r.ok) rows = await r.json();
  } catch (e) { rows = []; }

  const now = new Date().toISOString().slice(0, 10);
  const urls = rows.map(p => {
    const shop = p.shop || {};
    const name = (shop.name && shop.name.trim()) || p.nickname || 'Beautia designer';
    const city = (p.region || shop.area || '').toString().trim();
    const specs = (Array.isArray(shop.specialties) ? shop.specialties : []).join(' · ');
    const loc = `${SITE}/d/${encodeURIComponent(p.id)}`;
    const imgs = photoUrls(shop).map((src, i) =>
      `    <image:image><image:loc>${esc(src)}</image:loc><image:title>${esc(`${name} — ${specs || 'beauty'}${city ? ' · ' + city : ''}`)}</image:title></image:image>`
    ).join('\n');
    return `  <url>\n    <loc>${esc(loc)}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>${imgs ? '\n' + imgs : ''}\n  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}\n</urlset>\n`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
  res.status(200).end(xml);
}
