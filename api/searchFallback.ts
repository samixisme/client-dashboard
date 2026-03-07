import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '/home/clientdash/.firebase-admin.json';
  try {
    const fs = require('fs');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: 'https://client-dashboard-v2-default-rtdb.europe-west1.firebasedatabase.app',
      });
    }
  } catch (e) {
    console.warn('[searchFallback] Could not auto-initialize Firebase Admin.', e);
  }
}

// ── Circuit Breaker State ───────────────────────────────────────────────

let consecutiveFailures = 0;
const MAX_FAILURES = 5;
let circuitBreakerOpenUntil = 0;
const CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export function recordMeilisearchSuccess() {
  consecutiveFailures = 0;
  if (circuitBreakerOpenUntil > 0) {
    console.log('[searchFallback] Circuit breaker closed (recovered).');
    circuitBreakerOpenUntil = 0;
  }
}

export function recordMeilisearchFailure() {
  consecutiveFailures++;
  if (consecutiveFailures >= MAX_FAILURES && Date.now() > circuitBreakerOpenUntil) {
    console.warn(`[searchFallback] Circuit breaker opened! Meilisearch failed ${consecutiveFailures} times. Cooldown 5m.`);
    circuitBreakerOpenUntil = Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS;
  }
}

export function isCircuitBreakerOpen() {
  if (Date.now() < circuitBreakerOpenUntil) {
    return true;
  }
  // Cooldown expired, half-open
  return false;
}

// ── Retry Logic & Timeout ───────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Search timeout (10s)')), ms);
    promise
      .then(value => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(reason => {
        clearTimeout(timer);
        reject(reason);
      });
  });
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Fallback Database Search ────────────────────────────────────────────

// Basic mapping of index names to Firestore collections
const INDEX_COLLECTION_MAP: Record<string, string> = {
  projects: 'projects',
  tasks: 'tasks',
  brands: 'brands',
  feedback_items: 'feedback_items',
  invoices: 'invoices',
  clients: 'clients',
  drive_files: 'drive_files', // Drive files wouldn't be in firestore by default, but we'll try
};

export async function fallbackSearch(queries: any[]) {
  console.log('[searchFallback] Executing DB fallback search for querying...');
  const db = admin.firestore();
  const results = [];

  for (const q of queries) {
    const collectionName = INDEX_COLLECTION_MAP[q.indexUid];
    if (!collectionName) {
      results.push({
        indexUid: q.indexUid,
        hits: [],
        estimatedTotalHits: 0,
        facetDistribution: {},
        facetStats: {}
      });
      continue;
    }

    try {
      // For fallback we just fetch recent items and do memory filtering. 
      // This is safe because limit is usually 5-10
      const limit = q.limit || 10;
      const snapshot = await db.collection(collectionName).limit(30).get();
      
      const hits: any[] = [];
      const searchTerm = (q.q || '').toLowerCase();

      for (const doc of snapshot.docs) {
        const data = doc.data();
        data.id = doc.id;

        // Basic string text-search across all standard fields
        const searchableText = JSON.stringify(data).toLowerCase();
        if (!searchTerm || searchableText.includes(searchTerm)) {
          hits.push(data);
        }

        if (hits.length >= limit) break;
      }

      results.push({
        indexUid: q.indexUid,
        hits,
        estimatedTotalHits: hits.length,
        facetDistribution: {},
        facetStats: {}
      });
    } catch (e: any) {
      console.error(`[searchFallback] Fallback query failed for index ${q.indexUid}:`, e.message);
      results.push({
        indexUid: q.indexUid,
        hits: [],
        estimatedTotalHits: 0,
        facetDistribution: {},
        facetStats: {}
      });
    }
  }

  return { results };
}

// ── Resilient Wrapper ───────────────────────────────────────────────────

export async function withSearchResilience(
  queries: any[],
  searchFn: () => Promise<any>
) {
  if (isCircuitBreakerOpen()) {
    console.log('[searchFallback] Circuit breaker open, using fallback.');
    return fallbackSearch(queries);
  }

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const result = await withTimeout(searchFn(), 10000);
      recordMeilisearchSuccess();
      return result;
    } catch (err: any) {
      attempt++;
      recordMeilisearchFailure();

      console.error(`[searchFallback] Search failed (attempt ${attempt}/${maxRetries}):`, err.message || err);

      const isClientError = err.code === 'invalid_search_filter' || err.code === 'invalid_sort';
      
      // Do not retry on client errors (400 bad request)
      if (isClientError) {
        throw err; 
      }

      if (attempt >= maxRetries) {
        console.warn('[searchFallback] Max retries reached, falling back to DB search.');
        return fallbackSearch(queries);
      }

      // Exponential backoff
      const delay = 100 * Math.pow(2, attempt - 1); // 100ms, 200ms
      await sleep(delay);
    }
  }

  return fallbackSearch(queries);
}
