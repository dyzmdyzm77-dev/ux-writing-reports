// POST /api/delete — 관리자 페이지에서 특정 제보를 삭제한다. 본문(JSON): { url }
import { del } from '@vercel/blob';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다.' });
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    const url = body && body.url;
    if (!url) return res.status(400).json({ error: 'url이 없습니다.' });
    await del(url);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
