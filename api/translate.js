// POST /api/translate — 한국어 ↔ 영어 번역 (Gemini, 개인 API 키 방식)
// (기존 Cloudflare Worker의 POST /translate 를 이식. 사내 프록시가 workers.dev를 차단해서 옮김 — 2026-07)
import { callGemini, readBody } from '../lib/gemini.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다.' });

  const { text: rawText, apiKey } = readBody(req);
  const text = rawText.trim();
  if (!text) {
    return res.status(400).json({ error: '번역할 텍스트가 비어 있습니다.' });
  }
  const prompt =
    'You are a translator for app/UI microcopy. Detect the language of the input text. ' +
    'If it is Korean, translate it into natural, concise English suitable for a mobile/app UI. ' +
    'If it is English (or any non-Korean), translate it into natural Korean using a polite "해요체" tone suitable for a UI. ' +
    'Preserve line breaks. Do not add quotes, labels, or explanations. ' +
    'Return ONLY the translated text.\n\n' +
    'Input:\n' +
    text;
  const out = await callGemini(apiKey, prompt);
  if (out.error) {
    return res.status(502).json({ error: out.error });
  }
  // 한글 포함 여부로 방향 라벨만 붙여줌 (표시용)
  const hadKorean = /[가-힣]/.test(text);
  return res.status(200).json({
    translated: out.text,
    direction: hadKorean ? 'ko->en' : 'en->ko',
    usage: out.usage || null,
  });
}
