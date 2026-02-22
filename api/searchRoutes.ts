import { Router, Request, Response } from 'express';
import { getMeili } from './meiliClient';

const router = Router();

const ALL_INDEXES = [
  'projects',
  'tasks',
  'brands',
  'feedback_items',
  'invoices',
  'clients',
  'docs',
  'drive_files',
] as const;

// GET /api/search?q=&types=&page=&limit=
router.get('/', async (req: Request, res: Response) => {
  const q = String(req.query.q ?? '').trim();
  const typesParam = req.query.types ? String(req.query.types) : '';
  const page = Math.max(0, parseInt(String(req.query.page ?? '0'), 10));
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '5'), 10)));

  const requestedIndexes = typesParam
    ? typesParam.split(',').filter((t) => (ALL_INDEXES as readonly string[]).includes(t))
    : [...ALL_INDEXES];

  if (!q) {
    return res.json({ query: '', results: {}, processingTimeMs: 0 });
  }

  const start = Date.now();

  let client;
  try {
    client = getMeili();
  } catch {
    // MeiliSearch not configured — return empty results gracefully
    return res.json({ query: q, results: {}, processingTimeMs: 0 });
  }

  try {
    const queries = requestedIndexes.map((indexUid) => ({
      indexUid,
      q,
      limit,
      offset: page * limit,
      attributesToHighlight: ['*'],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
    }));

    const { results } = await client.multiSearch({ queries });

    const grouped: Record<string, { hits: unknown[]; estimatedTotalHits: number }> = {};
    for (const r of results) {
      grouped[r.indexUid] = {
        hits: r.hits,
        estimatedTotalHits: r.estimatedTotalHits ?? 0,
      };
    }

    return res.json({
      query: q,
      results: grouped,
      processingTimeMs: Date.now() - start,
    });
  } catch (err) {
    console.error('[searchRoutes] multi-search error:', err);
    return res.status(500).json({ error: 'Search failed' });
  }
});

// POST /api/search/sync — full re-index (admin only, best-effort)
router.post('/sync', async (_req: Request, res: Response) => {
  try {
    // Lazy import to avoid loading firebase-admin at startup
    const { runFullSync } = await import('./searchSync');
    runFullSync().catch((e) => console.error('[searchRoutes] sync error:', e));
    return res.json({ message: 'Full sync started in background' });
  } catch (err) {
    console.error('[searchRoutes] sync trigger error:', err);
    return res.status(500).json({ error: 'Sync failed to start' });
  }
});

// POST /api/search/sync/:type/:id — single-document partial sync
router.post('/sync/:type/:id', async (req: Request, res: Response) => {
  const type = String(req.params.type);
  const id = String(req.params.id);

  if (!(ALL_INDEXES as readonly string[]).includes(type)) {
    return res.status(400).json({ error: 'Unknown index type' });
  }

  const doc = req.body;
  if (!doc || typeof doc !== 'object') {
    return res.status(400).json({ error: 'Request body must be a JSON document' });
  }

  try {
    const index = getMeili().index(type);
    await index.addDocuments([{ ...doc, id }]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[searchRoutes] partial sync error:', err);
    return res.status(500).json({ error: 'Partial sync failed' });
  }
});

export default router;
