// GET /api/passport — 네이버 맞춤법 passportKey를 대신 긁어온다.
// 네이버 검색페이지는 CORS 헤더가 없어 플러그인에서 직접 못 긁는다 → 여기서 대신 긁는다.
// (기존 Cloudflare Worker의 GET / 를 이식. 사내 프록시가 workers.dev를 차단해서 옮김 — 2026-07)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET만 허용됩니다.' });

  try {
    const r = await fetch(
      'https://search.naver.com/search.naver?query=' + encodeURIComponent('맞춤법검사기'),
      { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' } }
    );
    if (!r.ok) {
      return res.status(502).json({ error: '검색페이지 HTTP ' + r.status });
    }
    const html = await r.text();
    const m = html.match(/passportKey=([0-9a-zA-Z]+)/);
    if (!m) {
      return res.status(502).json({ error: 'passportKey 못 찾음 (페이지 길이 ' + html.length + ')' });
    }
    return res.status(200).json({ passportKey: m[1] });
  } catch (e) {
    return res.status(502).json({ error: String(e && e.message ? e.message : e) });
  }
}
