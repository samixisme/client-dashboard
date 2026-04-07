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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(upstream, { headers: authHeaders(), signal: controller.signal });
      const body = await response.text();

      if (!response.ok) {
        return res.status(response.status).json({ error: `Linkwarden API error ${response.status}` });
      }

      res.setHeader('Content-Type', 'application/json');
      res.send(body);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return res.status(504).json({ error: 'Linkwarden API request timed out' });
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err) {
    console.error('[linkwarden] links error:', err);
    res.status(500).json({ error: 'Failed to fetch links from Linkwarden' });
  }
});

// ── GET /api/linkwarden/collections ───────────────────────────────────────
router.get('/collections', async (_req: Request, res: Response) => {
  if (!LINKWARDEN_TOKEN) {
    return res.status(503).json({ error: 'Linkwarden token not configured on server.' });
  }

  try {
    const upstream = `${LINKWARDEN_BASE_URL}/api/v1/collections`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(upstream, { headers: authHeaders(), signal: controller.signal });
      const body = await response.text();

      if (!response.ok) {
        return res.status(response.status).json({ error: `Linkwarden API error ${response.status}` });
      }

      res.setHeader('Content-Type', 'application/json');
      res.send(body);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return res.status(504).json({ error: 'Linkwarden API request timed out' });
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err) {
    console.error('[linkwarden] collections error:', err);
    res.status(500).json({ error: 'Failed to fetch collections from Linkwarden' });
  }
});

export default router;
