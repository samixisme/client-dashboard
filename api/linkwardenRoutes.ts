import { Router, Request, Response } from 'express';

const router = Router();

const LINKWARDEN_BASE_URL = (process.env.LINKWARDEN_URL ?? 'https://links.samixism.com').replace(/\/+$/, '');
const LINKWARDEN_TOKEN   = process.env.LINKWARDEN_TOKEN ?? '';

function authHeaders() {
  return {
    Authorization: `Bearer ${LINKWARDEN_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

// ── GET /api/linkwarden/links ──────────────────────────────────────────────
// Proxies to /api/v1/search, passes query params through transparently
router.get('/links', async (req: Request, res: Response) => {
  if (!LINKWARDEN_TOKEN) {
    return res.status(503).json({ error: 'Linkwarden token not configured on server.' });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  try {
    const qs = new URLSearchParams();
    const allowed = ['searchQueryString', 'tagId', 'collectionId', 'type', 'skip', 'take',
                     'searchByName', 'searchByUrl', 'searchByDescription', 'searchByTextContent'];
    for (const key of allowed) {
      const val = req.query[key];
      if (val !== undefined && val !== '') qs.set(key, String(val));
    }
    const qsStr = qs.toString() ? `?${qs.toString()}` : '';
    const upstream = `${LINKWARDEN_BASE_URL}/api/v1/search${qsStr}`;

    const response = await fetch(upstream, { headers: authHeaders(), signal: controller.signal as any });
    const body = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({ error: `Linkwarden API error ${response.status}` });
    }

    res.setHeader('Content-Type', 'application/json');
    res.send(body);
  } catch (err: any) {
    console.error('[linkwarden] links error:', err);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Gateway Timeout: Linkwarden took too long to respond' });
    }
    res.status(500).json({ error: 'Failed to fetch links from Linkwarden' });
  } finally {
    clearTimeout(timeoutId);
  }
});

// ── GET /api/linkwarden/collections ───────────────────────────────────────
router.get('/collections', async (_req: Request, res: Response) => {
  if (!LINKWARDEN_TOKEN) {
    return res.status(503).json({ error: 'Linkwarden token not configured on server.' });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  try {
    const upstream = `${LINKWARDEN_BASE_URL}/api/v1/collections`;
    const response = await fetch(upstream, { headers: authHeaders(), signal: controller.signal as any });
    const body = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({ error: `Linkwarden API error ${response.status}` });
    }

    res.setHeader('Content-Type', 'application/json');
    res.send(body);
  } catch (err: any) {
    console.error('[linkwarden] collections error:', err);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Gateway Timeout: Linkwarden took too long to respond' });
    }
    res.status(500).json({ error: 'Failed to fetch collections from Linkwarden' });
  } finally {
    clearTimeout(timeoutId);
  }
});

export default router;
