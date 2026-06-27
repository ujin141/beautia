// Beautia 번역 API (Vercel 서버리스 함수)
// 환경변수 OPENAI_API_KEY 필요 (Vercel → Settings → Environment Variables)
// 요청: POST /api/translate  { text:"...", target:"ko" | "ja" }
// 응답: { translated:"..." }
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const text = (body && body.text || '').toString().slice(0, 4000);
    const target = (body && body.target) === 'ja' ? 'Japanese' : 'Korean';
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
          { role: 'system', content: `You translate posts in a Korean–Japanese beauty community. Translate the user's text into ${target}. Keep it natural, casual and friendly. Preserve emojis and line breaks. Output ONLY the translation — no quotes, no explanations.` },
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
