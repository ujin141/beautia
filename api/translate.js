// Beautia 번역 API (Vercel 서버리스 함수)
// 환경변수 OPENAI_API_KEY 필요 (Vercel → Settings → Environment Variables)
// 요청: POST /api/translate  { text:"...", target:"ko" | "ja" }
// 응답: { translated:"..." }
// 비용 남용 방지: 워밍된 인스턴스 동안 IP별 호출 제한(베스트에포트) + 오리진 제한
const RL = globalThis.__btTransRL || (globalThis.__btTransRL = new Map());
function rateLimited(ip) {
  const now = Date.now(), WIN = 60000, MAX = 15; // 분당 15회
  const arr = (RL.get(ip) || []).filter(t => now - t < WIN);
  if (arr.length >= MAX) return true;
  arr.push(now); RL.set(ip, arr); return false;
}
function originAllowed(req) {
  const o = (req.headers.origin || '') + ' ' + (req.headers.referer || '');
  if (/https?:\/\/(beautia\.io|[a-z0-9-]+\.vercel\.app|localhost(:\d+)?)/i.test(o)) return true;
  return !req.headers.origin && !req.headers.referer; // 동일출처 일부 환경 허용
}
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  try {
    if (!originAllowed(req)) { res.status(403).json({ error: 'forbidden' }); return; }
    const ip = ((req.headers['x-forwarded-for'] || '').split(',')[0] || 'x').trim();
    if (rateLimited(ip)) { res.status(429).json({ error: 'too many requests' }); return; }
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const text = (body && body.text || '').toString().slice(0, 4000);
    const LANGS = {
      ko:'Korean', en:'English', ja:'Japanese', 'zh':'Simplified Chinese', 'zh-cn':'Simplified Chinese',
      'zh-tw':'Traditional Chinese', th:'Thai', vi:'Vietnamese', id:'Indonesian', ms:'Malay',
      es:'Spanish', fr:'French', de:'German', pt:'Portuguese', it:'Italian', ru:'Russian',
      ar:'Arabic', hi:'Hindi', tr:'Turkish', tl:'Tagalog'
    };
    const tcode = (body && body.target || 'ko').toString().toLowerCase();
    // 프롬프트 인젝션 방지: 화이트리스트에 없으면 원시 입력을 프롬프트에 넣지 않고 안전 기본값으로 폴백
    const target = LANGS[tcode] || 'English';
    if (!text.trim()) { res.status(400).json({ error: 'no text' }); return; }
    const key = process.env.OPENAI_API_KEY;
    if (!key) { res.status(500).json({ error: 'OPENAI_API_KEY not set' }); return; }
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: `You translate reviews and posts on a global beauty-designer platform (hair, makeup, nail, lash, skin, bridal). Translate the user's text into ${target}. Keep it natural, casual and friendly, using natural beauty-industry wording. Preserve emojis and line breaks. If the text is already in ${target}, return it unchanged. Output ONLY the translation — no quotes, no explanations.` },
          { role: 'user', content: text }
        ]
      })
    });
    const j = await r.json();
    const out = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!out) { res.status(502).json({ error: 'translate failed', detail: j && j.error || null }); return; }
    res.status(200).json({ translated: out.trim() });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
}
