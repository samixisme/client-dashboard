import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

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
    console.warn('[searchAnalytics] Could not auto-initialize Firebase Admin.', e);
  }
}

const db = admin.firestore();
const SEARCH_EVENTS_COLLECTION = 'search_events';
// Generate a transient fallback key if none provided
const HMAC_SECRET = process.env.SEARCH_ANALYTICS_SECRET || crypto.randomBytes(32).toString('hex');

/**
 * Anonymizes a search query using HMAC-SHA256
 */
function anonymizeQuery(query: string, userId?: string): string {
  const hmac = crypto.createHmac('sha256', HMAC_SECRET);
  hmac.update(`${query.trim().toLowerCase()}_${userId || 'anonymous'}`);
  return hmac.digest('hex');
}

/**
 * Logs a search query event asynchronously
 */
export function logSearchQuery(
  query: string,
  resultCounts: number,
  processingTimeMs: number,
  indexNames: string[],
  userId?: string
) {
  // Fire and forget, don't return promise
  setImmediate(async () => {
    try {
      if (!query || query.trim() === '') return;

      const queryHash = anonymizeQuery(query, userId);
      const timestamp = admin.firestore.FieldValue.serverTimestamp();

      await db.collection(SEARCH_EVENTS_COLLECTION).add({
        eventType: 'search',
        // Optional: raw query could be excluded for strict privacy, but requirement 
        // mentions returning empty queries later. For true anonymity, we might omit it,
        // but if it's omitted we can't show actual text in trending.
        // We'll store a truncated / cleaned version or hash depending on exact privacy needs.
        // Requirement said "hashing sensitive data".
        queryHash,
        results: resultCounts,
        processingTimeMs,
        indexNames,
        userId: userId ? anonymizeQuery(userId) : null,
        createdAt: timestamp,
      });
    } catch (e) {
      console.error('[searchAnalytics] Failed to log search query:', e);
    }
  });
}

/**
 * Logs a result click event asynchronously
 */
export function logResultClick(
  queryHash: string,
  indexUid: string,
  resultId: string,
  position: number,
  userId?: string
) {
  setImmediate(async () => {
    try {
      const timestamp = admin.firestore.FieldValue.serverTimestamp();

      await db.collection(SEARCH_EVENTS_COLLECTION).add({
        eventType: 'click',
        queryHash,
        indexNames: [indexUid],
        resultClicked: { indexUid, resultId, position },
        userId: userId ? anonymizeQuery(userId) : null,
        createdAt: timestamp,
      });
    } catch (e) {
      console.error('[searchAnalytics] Failed to log result click:', e);
    }
  });
}

/**
 * Cleans up old search events (> 90 days old)
 * This could be called by a cron job
 */
export async function cleanupOldAnalytics() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  console.log('[searchAnalytics] Cleaning up old analytics events...');
  
  const snapshot = await db.collection(SEARCH_EVENTS_COLLECTION)
    .where('createdAt', '<', admin.firestore.Timestamp.fromDate(ninetyDaysAgo))
    .limit(500)
    .get();

  if (snapshot.empty) return;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`[searchAnalytics] Deleted ${snapshot.size} old events.`);
}
