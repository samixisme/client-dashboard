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

    const { withSearchResilience } = await import('./searchFallback');
    
    // Check if the client is valid. If not configured, we'll force an error to trigger fallback.
    const runSearch = async () => {
      if (!client) throw new Error('Meilisearch not configured');
      return client.multiSearch({ queries });
    };

    const searchResponse: any = await withSearchResilience(queries, runSearch);
    const resultsResponse = searchResponse.results;
    const isFallback = searchResponse.fallback === true;

    const grouped: Record<string, any> = {};
    for (const r of resultsResponse as any[]) {
      grouped[r.indexUid] = {
        hits: r.hits,
        estimatedTotalHits: r.estimatedTotalHits ?? 0,
        facetDistribution: r.facetDistribution,
        facetStats: r.facetStats,
      };
    }

    const processingTimeMs = Date.now() - start;
    
    // Log search event asynchronously
    if (q) {
      import('./searchAnalytics').then(({ logSearchQuery }) => {
        let totalHits = 0;
        for (const key of Object.keys(grouped)) {
          totalHits += grouped[key].estimatedTotalHits || 0;
        }
        
        logSearchQuery(q, totalHits, processingTimeMs, requestedIndexes as string[]);
      }).catch(e => console.error('[searchRoutes] Could not load analytics module:', e));
    }
    
    // Log latency for health metrics
    import('./searchMonitoring').then(({ recordSearchLatency }) => {
      recordSearchLatency(processingTimeMs);
    }).catch(e => console.warn('[searchRoutes] Could not report latency:', e));

    return res.json({
      query: q,
      results: grouped,
      processingTimeMs,
      warning: isFallback ? 'Search temporarily unavailable. Trying basic search...' : undefined,
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

// ── Analytics Endpoints ───────────────────────────────────────────────────

import type * as adminFirestore from 'firebase-admin/firestore';
let analyticsCache: {
  popular?: { data: any, expiresAt: number },
  trending?: { data: any, expiresAt: number },
  noResults?: { data: any, expiresAt: number }
} = {};

async function fetchAndAggregateEvents(days: number, type: 'search' | 'click', filterNoResults = false) {
  const admin = await import('firebase-admin');
  const db = admin.firestore();
  
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  let query: any = db.collection('search_events')
    .where('createdAt', '>', admin.firestore.Timestamp.fromDate(fromDate))
    .where('eventType', '==', type);

  if (filterNoResults) {
    query = query.where('results', '==', 0);
  }

  // Note: For a production app at scale, this should be done via a materialized view/cloud function
  // or a Google Cloud BigQuery sync, as fetching thousands of docs dynamically is slow.
  const snapshot = await query.limit(5000).get(); 

  const counts: Record<string, number> = {};
  snapshot.forEach((doc: adminFirestore.QueryDocumentSnapshot) => {
    const data = doc.data();
    if (data.queryHash) {
      counts[data.queryHash] = (counts[data.queryHash] || 0) + 1;
    }
  });

  return Object.entries(counts)
    .map(([queryHash, count]) => ({ queryHash, count }))
    .sort((a, b) => b.count - a.count);
}

// GET /api/search/analytics/popular
router.get('/analytics/popular', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const days = parseInt(String(req.query.days || '30'), 10);

    if (analyticsCache.popular && analyticsCache.popular.expiresAt > Date.now()) {
      return res.json({ searches: analyticsCache.popular.data.slice(0, limit) });
    }

    const aggregated = await fetchAndAggregateEvents(days, 'search');
    analyticsCache.popular = { data: aggregated, expiresAt: Date.now() + 5 * 60 * 1000 };

    return res.json({ searches: aggregated.slice(0, limit) });
  } catch (err) {
    console.error('[searchRoutes] popular analytics error:', err);
    return res.status(500).json({ error: 'Failed to fetch popular searches' });
  }
});

// GET /api/search/analytics/trending
router.get('/analytics/trending', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const days = parseInt(String(req.query.days || '7'), 10); // trending defaults to 7 days

    if (analyticsCache.trending && analyticsCache.trending.expiresAt > Date.now()) {
      return res.json({ searches: analyticsCache.trending.data.slice(0, limit) });
    }

    // Simplified trending calculation: highly active in recent 7 days
    const aggregated = await fetchAndAggregateEvents(days, 'search');
    analyticsCache.trending = { data: aggregated, expiresAt: Date.now() + 5 * 60 * 1000 };

    return res.json({ searches: aggregated.slice(0, limit) });
  } catch (err) {
    console.error('[searchRoutes] trending analytics error:', err);
    return res.status(500).json({ error: 'Failed to fetch trending searches' });
  }
});

// GET /api/search/analytics/no-results
router.get('/analytics/no-results', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const days = parseInt(String(req.query.days || '7'), 10);

    if (analyticsCache.noResults && analyticsCache.noResults.expiresAt > Date.now()) {
      return res.json({ searches: analyticsCache.noResults.data.slice(0, limit) });
    }

    const aggregated = await fetchAndAggregateEvents(days, 'search', true);
    analyticsCache.noResults = { data: aggregated, expiresAt: Date.now() + 5 * 60 * 1000 };

    return res.json({ searches: aggregated.slice(0, limit) });
  } catch (err) {
    console.error('[searchRoutes] no-results analytics error:', err);
    return res.status(500).json({ error: 'Failed to fetch no-results searches' });
  }
});

// POST /api/search/analytics/click
router.post('/analytics/click', async (req: Request, res: Response) => {
  try {
    const { queryHash, indexUid, resultId, position } = req.body;
    if (!queryHash || !indexUid || !resultId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const { logResultClick } = await import('./searchAnalytics');
    logResultClick(queryHash, indexUid, resultId, position || 0);

    return res.status(202).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to log click event' });
  }
});

// ── Original Routes ───────────────────────────────────────────────────────

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
    const { checkSearchHealth } = await import('./searchMonitoring');
    const intervalMs = process.env.SEARCH_SYNC_INTERVAL_MS ? parseInt(process.env.SEARCH_SYNC_INTERVAL_MS, 10) : 3 * 60 * 1000;
    const healthData = await checkSearchHealth(intervalMs);
    return res.status(healthData.status === 'healthy' ? 200 : 503).json(healthData);
  } catch (err) {
    console.error('[searchRoutes] health check error:', err);
    return res.status(500).json({ error: 'Health check failed' });
  }
});

export default router;
