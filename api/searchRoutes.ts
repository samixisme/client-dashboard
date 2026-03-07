import { Router, Request, Response } from 'express';
import { getMeili } from './meiliClient';
import { INDEX_CONFIGS } from './searchConfig';

const router = Router();

const ALL_INDEXES = [
  'projects',
  'tasks',
  'brands',
  'feedback_items',
  'invoices',
  'clients',
  'drive_files',
] as const;

/**
 * Extracts field names from a Meilisearch filter string.
 * Example: `status = 'active' AND priority > 2` -> ['status', 'priority']
 */
function extractFilterFields(filterStr: string): string[] {
  const fields = new Set<string>();
  const regex = /\b([a-zA-Z0-9_.-]+)\s*(?:=|!=|>|>=|<|<=|IN\b|NOT\s+IN\b)/gi;
  let match;
  while ((match = regex.exec(filterStr)) !== null) {
    const field = match[1];
    if (!['AND', 'OR', 'NOT', 'TO', 'EXISTS', 'EMPTY'].includes(field.toUpperCase())) {
      fields.add(field);
    }
  }
  return Array.from(fields);
}

// GET /api/search?q=&types=&page=&limit=&filters=&sort=&facets=
router.get('/', async (req: Request, res: Response) => {
  const q = String(req.query.q ?? '').trim();
  const typesParam = req.query.types ? String(req.query.types) : '';
  const page = Math.max(0, parseInt(String(req.query.page ?? '0'), 10));
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '5'), 10)));
  
  const filters = req.query.filters ? String(req.query.filters) : undefined;
  const sort = req.query.sort ? String(req.query.sort).split(',') : undefined;
  const facets = req.query.facets ? String(req.query.facets).split(',') : undefined;

  const requestedIndexes = typesParam
    ? typesParam.split(',').filter((t) => (ALL_INDEXES as readonly string[]).includes(t))
    : [...ALL_INDEXES];

  if (filters) {
    const singleQuotes = (filters.match(/'/g) || []).length;
    const doubleQuotes = (filters.match(/"/g) || []).length;
    if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
      return res.status(400).json({ error: 'Filter syntax error: Unbalanced quotes.' });
    }
  }

  // If there's no query, facets, or filters, do not search
  if (!q && !filters && !facets) {
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
    const filterFields = filters ? extractFilterFields(filters) : [];

    const queries = requestedIndexes.map((indexUid) => {
      const config = INDEX_CONFIGS[indexUid];
      
      const queryPayload: any = {
        indexUid,
        q,
        limit,
        offset: page * limit,
        attributesToHighlight: ['*'],
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>',
        showMatchesPosition: true,
      };

      if (filters) {
        // Validate filter fields for this specific index before sending to avoid crashing multiSearch
        const unsupportedFields = filterFields.filter(f => !config?.filterableAttributes?.includes(f));
        if (unsupportedFields.length === 0) {
          queryPayload.filter = filters;
        }
      }

      if (sort) {
        const validSorts = sort.filter(s => {
          const field = s.split(':')[0];
          return config?.sortableAttributes?.includes(field);
        });
        if (validSorts.length > 0) {
          queryPayload.sort = validSorts;
        }
      }

      if (facets) {
        const validFacets = facets.filter(f => config?.filterableAttributes?.includes(f));
        if (validFacets.length > 0) {
          queryPayload.facets = validFacets;
        }
      }

      return queryPayload;
    });

    const { results } = await client.multiSearch({ queries });

    const grouped: Record<string, any> = {};
    for (const r of results as any[]) {
      grouped[r.indexUid] = {
        hits: r.hits,
        estimatedTotalHits: r.estimatedTotalHits ?? 0,
        facetDistribution: r.facetDistribution,
        facetStats: r.facetStats,
      };
    }

    return res.json({
      query: q,
      results: grouped,
      processingTimeMs: Date.now() - start,
    });
  } catch (err: any) {
    console.error('[searchRoutes] multi-search error:', err);
    if (err.code === 'invalid_search_filter') {
      return res.status(400).json({ error: `Filter syntax error: ${err.message}` });
    }
    if (err.code === 'invalid_sort') {
      return res.status(400).json({ error: `Sort setting error: ${err.message}` });
    }
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

// GET /api/search/health — detailed sync status (DES-36)
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const { checkSyncHealth } = await import('./searchMonitoring');
    const intervalMs = process.env.SEARCH_SYNC_INTERVAL_MS ? parseInt(process.env.SEARCH_SYNC_INTERVAL_MS, 10) : 3 * 60 * 1000;
    const healthData = await checkSyncHealth(intervalMs);
    return res.status(healthData.status === 'healthy' ? 200 : 503).json(healthData);
  } catch (err) {
    console.error('[searchRoutes] health check error:', err);
    return res.status(500).json({ error: 'Health check failed' });
  }
});

export default router;
