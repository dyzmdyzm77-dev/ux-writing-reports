// POST /api/report — 플러그인이 보낸 "오수정 제보"를 Vercel Blob에 저장한다.
// 요청 본문(JSON): { nodeId, before, after, reason, comment, fileName }
import { put } from '@vercel/blob';

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

  try {
    // Vercel Node 함수는 application/json 본문을 자동 파싱하지만, 문자열로 올 때도 대비
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v)).slice(0, 4000);
    const record = {
      nodeId: str(body.nodeId),
      before: str(body.before),
      after: str(body.after),
      reason: str(body.reason),
      comment: str(body.comment),
      fileName: str(body.fileName),
      ts: new Date().toISOString(),
    };
    if (!record.before && !record.after && !record.comment) {
      return res.status(400).json({ error: '저장할 내용이 없습니다.' });
    }

    // 파일명이 시간 역순으로 정렬되도록(최신이 먼저) 큰 수에서 빼서 접두어로 사용
    const inv = String(9999999999999 - Date.now()).padStart(13, '0');
    const rand = Math.random().toString(36).slice(2, 8);
    await put(`reports/${inv}-${rand}.json`, JSON.stringify(record), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
