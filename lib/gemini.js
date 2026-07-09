// Gemini 호출 공통 모듈 — api/recommend.js, api/translate.js가 함께 쓴다.
// (기존 Cloudflare Worker(naver-passport-proxy/worker.js)에서 이식.
//  사내 프록시가 workers.dev를 차단해서 vercel.app으로 서버를 옮김 — 2026-07)
//
// apiKey는 요청 본문에서 온 개인 키. 주 모델로 호출하고, 혼잡(503)·분당 한도(429)면 예비 모델로 한 번 더 시도한다.
// schema를 주면 구조화 출력(responseSchema)으로 JSON 형식을 강제한다.
// 성공 시 { text, usage } 반환 — usage는 Gemini usageMetadata(토큰 수), 플러그인이 사용량 표시에 씀.

// 무료 등급에서 쓸 수 있는 모델. 한국어 품질이 좋고 응답이 빠르다.
// 주의: gemini-2.0-flash는 무료 할당량이 0이 되어 429가 남 (2026-07 확인) — 2.5 계열을 쓸 것.
const GEMINI_MODEL = 'gemini-2.5-flash';
// 주 모델이 혼잡(503)하거나 분당 한도(429)에 걸리면 이 예비 모델로 자동 재시도
const GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash-lite';

export async function callGemini(apiKey, prompt, schema) {
  if (!apiKey) {
    return { error: 'Gemini API 키가 없어요. 플러그인 설정에서 개인 키를 넣어주세요.' };
  }
  const first = await callGeminiModel(apiKey, GEMINI_MODEL, prompt, schema);
  if (!first.retryable) return first;
  const second = await callGeminiModel(apiKey, GEMINI_FALLBACK_MODEL, prompt, schema);
  return second.retryable ? { error: second.error } : second;
}

async function callGeminiModel(apiKey, model, prompt, schema) {
  try {
    const url =
      'https://generativelanguage.googleapis.com/v1beta/models/' +
      model +
      ':generateContent?key=' +
      apiKey;
    // thinkingBudget 0: 2.5 모델의 '생각' 단계를 꺼서 응답을 ~8배 빠르게 (짧은 문구 작업엔 품질 차이 미미)
    const generationConfig = { temperature: 0.7, thinkingConfig: { thinkingBudget: 0 } };
    if (schema) {
      generationConfig.responseMimeType = 'application/json';
      generationConfig.responseSchema = schema;
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      return {
        error: 'Gemini(' + model + ') HTTP ' + res.status + ': ' + detail.slice(0, 300),
        retryable: res.status === 503 || res.status === 429, // 혼잡/한도 → 예비 모델로 재시도 가능
      };
    }
    const data = await res.json();
    const text =
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text;
    if (!text) return { error: 'Gemini 응답 비어 있음' };
    const um = data && data.usageMetadata;
    const usage = {
      prompt: (um && um.promptTokenCount) || 0,
      output: (um && um.candidatesTokenCount) || 0,
      total: (um && um.totalTokenCount) || 0,
      model: model,
    };
    return { text: String(text).trim(), usage };
  } catch (e) {
    return { error: 'Gemini 호출 실패: ' + String(e && e.message ? e.message : e) };
  }
}

// 요청 본문에서 text / apiKey 안전하게 꺼내기
// (Vercel Node 함수는 application/json 본문을 자동 파싱하지만, 문자열로 올 때도 대비 — api/report.js와 같은 방식)
export function readBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_e) { body = {}; }
  }
  body = body || {};
  return {
    text: typeof body.text === 'string' ? body.text : '',
    apiKey: typeof body.apiKey === 'string' ? body.apiKey.trim() : '',
  };
}
