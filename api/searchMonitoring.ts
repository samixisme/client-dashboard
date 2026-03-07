import * as admin from 'firebase-admin';
import axios from 'axios';
import { getSyncCheckpoint } from './searchState';

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

  try {
    await axios.post(webhookUrl, {
      sync_job_status: 'failed',
      index_name: indexName,
      failure_count: failureCount,
      latest_error: errorMsg,
      timestamp: new Date().toISOString()
    });
    console.log(`[searchSync] 🚨 Alert webhook sent for ${indexName}`);
  } catch (error: any) {
    console.error(`[searchSync] Failed to send alert webhook: ${error?.message}`);
  }
}

/**
 * Health check core logic
 */
export async function checkSyncHealth(intervalMs: number) {
  const indexes = ['projects', 'tasks', 'brands', 'feedback_items', 'invoices', 'clients', 'drive_files'];
  const healthData: any = {
    status: 'healthy',
    indexes: {}
  };
  
  const now = Date.now();

  for (const idx of indexes) {
    const checkpoint = await getSyncCheckpoint(idx);
    if (!checkpoint) {
      healthData.indexes[idx] = { status: 'unknown', missing: true };
      continue;
    }
    
    const isOverdue = (now - checkpoint.lastSyncAt) > (2 * intervalMs);
    const idxStatus = isOverdue ? 'overdue' : (checkpoint.consecutiveFailures > 0 ? 'failing' : 'healthy');
    
    if (idxStatus !== 'healthy') {
      healthData.status = 'degraded';
    }

    healthData.indexes[idx] = {
      status: idxStatus,
      lastSyncAt: checkpoint.lastSyncAt,
      consecutiveFailures: checkpoint.consecutiveFailures,
      recordsCount: checkpoint.lastSyncedDocCount,
    };
  }

  return healthData;
}
