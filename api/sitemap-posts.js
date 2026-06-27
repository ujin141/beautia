// Beautia 글 사이트맵 — /sitemap-posts.xml (vercel.json rewrite로 연결)
// 새 글이 올라오면 자동으로 색인 대상에 포함
const SB_URL = 'https://pzbxcktaljhesrfnqwzq.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Ynhja3RhbGpoZXNyZm5xd3pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjc1MjYsImV4cCI6MjA4Mzc0MzUyNn0.aUZbTgfWbjEISNr1-cu9YJnOGj1lzjXeRVifHygAplc';
const SITE = 'https://beautia.io';

export default async function handler(req, res) {
  let rows = [];
  try {
    const r = await fetch(SB_URL + '/rest/v1/posts?hidden=eq.false&select=id,created_at&order=created_at.desc&limit=2000', { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } });
    if (r.ok) rows = await r.json();
  } catch (e) {}
  const urls = (rows || []).map(p => `  <url><loc>${SITE}/p/${p.id}</loc><lastmod>${new Date(p.created_at || Date.now()).toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
  res.status(200).end(xml);
}
