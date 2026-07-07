// GET /api/list — 저장된 제보를 최신순으로 모아서 관리자 페이지에 돌려준다.
import { list } from '@vercel/blob';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { blobs } = await list({ prefix: 'reports/' });
    // 파일명(inv 접두어)이 작을수록 최신 — 오름차순 정렬하면 최신이 먼저 온다
    blobs.sort((a, b) => a.pathname.localeCompare(b.pathname));

    const items = await Promise.all(
      blobs.map(async (bl) => {
        let data = {};
        try {
          const r = await fetch(bl.url, { cache: 'no-store' });
          data = await r.json();
        } catch { /* 깨진 항목은 빈 데이터로 */ }
        return { key: bl.pathname, url: bl.url, data };
      })
    );

    return res.status(200).json({ items });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
