// Beautia · 번역 Edge Function (OpenAI 프록시)
// 배포: supabase functions deploy translate --no-verify-jwt 는 쓰지 말 것(인증 필요).
//   1) supabase secrets set OPENAI_API_KEY=sk-...
//   2) supabase functions deploy translate
// 클라이언트: SB.functions.invoke('translate',{ body:{ text, target } })  (자동으로 사용자 JWT 첨부)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

const LANG_NAME: Record<string, string> = { ko: "Korean", en: "English", ja: "Japanese", th: "Thai" };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { text, target } = await req.json();
    if (!text || !target || !LANG_NAME[target]) {
      return new Response(JSON.stringify({ error: "text and valid target required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        messages: [
          { role: "system", content: `You are a translator for a beauty-booking chat. Translate the user's message into ${LANG_NAME[target]}. Keep it natural and casual, preserve emojis and names, and reply with ONLY the translation, no quotes or notes.` },
          { role: "user", content: String(text).slice(0, 2000) },
        ],
      }),
    });
    const j = await r.json();
    const out = j?.choices?.[0]?.message?.content?.trim() ?? "";
    return new Response(JSON.stringify({ translated: out }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
