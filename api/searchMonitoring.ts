import * as admin from 'firebase-admin';
import axios from 'axios';
import { getSyncCheckpoint } from './searchState';
import { getMeili } from './meiliClient';
import { validateUrl } from './urlValidator';

// ── In-Memory Latency Tracking for p50/p95/p99 ────────────────────────
const MAX_LATENCY_SAMPLES = 1000;
let latencySamples: number[] = [];

export function recordSearchLatency(ms: number) {
  latencySamples.push(ms);
  if (latencySamples.length > MAX_LATENCY_SAMPLES) {
    latencySamples.shift();
  }
}

function calculatePercentiles(samples: number[]) {
  if (samples.length === 0) return { p50: 0, p95: 0, p99: 0, count: 0 };
  
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    p50: sorted[Math.floor(sorted.length * 0.50)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
    count: sorted.length
  };
}

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

export interface SyncEvent {
  timestamp: Date | admin.firestore.FieldValue;
  event: 'search_sync';
  indexName: string;
  status: 'succeeded' | 'partial' | 'failed';
  duration: number; // ms
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  recordsSkipped: number;
  error?: string;
}

/**
 * Log a sync event to the database and optionally trigger alerts.
 */
export async function logSyncEvent(eventDetails: SyncEvent): Promise<void> {
  try {
    // Save to Firestore with 30-day TTL (TTL index assumed configured in Firebase Console)
    const docRef = db.collection('sync_events').doc();
    await docRef.set({
      ...eventDetails,
      timestamp: eventDetails.timestamp || admin.firestore.FieldValue.serverTimestamp(),
    });

    if (eventDetails.status === 'succeeded') {
      console.log(`[searchSync] ✅ Sync succeeded for ${eventDetails.indexName} in ${eventDetails.duration}ms. C: ${eventDetails.recordsCreated}, U: ${eventDetails.recordsUpdated}, D: ${eventDetails.recordsDeleted}`);
    } else {
      console.error(`[searchSync] ❌ Sync ${eventDetails.status} for ${eventDetails.indexName} in ${eventDetails.duration}ms. Error: ${eventDetails.error}`);
    }
  } catch (error) {
    console.error('[searchSync] Failed to log sync event', error);
  }
}

/**
 * Trigger an alert webhook if configured
 */
export async function triggerSyncAlert(indexName: string, failureCount: number, errorMsg: string): Promise<void> {
  const webhookUrl = process.env.SEARCH_SYNC_ALERT_WEBHOOK;
  if (!webhookUrl) return;

  const urlValidation = validateUrl(webhookUrl);
  if (!urlValidation.isValid) {
    console.error(`[searchSync] 🚨 Alert webhook URL validation failed: ${urlValidation.error}`);
    return;
  }

  try {
    await axios.post(webhookUrl, {
      sync_job_status: 'failed',
      index_name: indexName,
      failure_count: failureCount,
      latest_error: errorMsg,
      timestamp: new Date().toISOString()
    }, {
      timeout: 5000
    });
    console.log(`[searchSync] 🚨 Alert webhook sent for ${indexName}`);
  } catch (error: any) {
    console.error(`[searchSync] Failed to send alert webhook: ${error?.message}`);
  }
}

/**
 * Health check core logic
 */
export async function checkSearchHealth(intervalMs: number) {
  const indexes = ['projects', 'tasks', 'brands', 'feedback_items', 'invoices', 'clients', 'drive_files'];
  
  const healthData: any = {
    status: 'healthy',
    meilisearch: { status: 'unknown' },
    sync: { status: 'healthy', indexes: {} },
    metrics: calculatePercentiles(latencySamples)
  };
  
  const now = Date.now();

  // 1. Check Meilisearch Connectivity and Queues
  try {
    const client = getMeili();
    const isHealthy = await client.health();
    if (isHealthy.status === 'available') {
      const { results: activeTasks } = await client.getTasks({ statuses: ['enqueued', 'processing'] });
      
      healthData.meilisearch = {
        status: 'available',
        activeTaskCount: activeTasks.length,
      };
    } else {
      healthData.status = 'degraded';
      healthData.meilisearch.status = 'down';
    }
  } catch (err: any) {
    healthData.status = 'degraded';
    healthData.meilisearch = {
      status: 'unreachable',
      error: err.message
    };
  }

  // 2. Check Sync Health
  for (const idx of indexes) {
    const checkpoint = await getSyncCheckpoint(idx);
    if (!checkpoint) {
      healthData.sync.indexes[idx] = { status: 'unknown', missing: true };
      continue;
    }
    
    const isOverdue = (now - checkpoint.lastSyncAt) > (2 * intervalMs);
    const idxStatus = isOverdue ? 'overdue' : (checkpoint.consecutiveFailures > 0 ? 'failing' : 'healthy');
    
    if (idxStatus !== 'healthy') {
      healthData.sync.status = 'degraded';
      // Overall status is degraded if sync is failing
      if (healthData.status === 'healthy') healthData.status = 'degraded';
    }

    healthData.sync.indexes[idx] = {
      status: idxStatus,
      lastSyncAt: checkpoint.lastSyncAt,
      consecutiveFailures: checkpoint.consecutiveFailures,
      recordsCount: checkpoint.lastSyncedDocCount,
    };
  }

  return healthData;
}
