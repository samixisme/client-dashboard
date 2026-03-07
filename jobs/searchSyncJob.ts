import 'dotenv/config';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import * as admin from 'firebase-admin';
import { bulkUpsert, deleteDocument, SearchTask } from '../api/searchSync';
import { queryChangedDocuments } from '../api/searchChangeTracking';
import { getSyncCheckpoint, initializeSyncCheckpoint, updateSyncCheckpoint, updateConsecutiveFailures } from '../api/searchState';
import { logSyncEvent, triggerSyncAlert } from '../api/searchMonitoring';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const INDEX_MAPPINGS: Record<string, (id: string, d: admin.firestore.DocumentData) => Record<string, unknown>> = {
  projects: (id, d) => ({ id, name: d.name ?? '', description: d.description ?? '', status: d.status ?? '', brandId: d.brandId ?? '' }),
  tasks: (id, d) => ({ id, title: d.title ?? '', description: d.description ?? '', priority: d.priority ?? '', status: d.status ?? '', dueDate: d.dueDate ?? '', boardId: d.boardId ?? '' }),
  brands: (id, d) => ({ id, name: d.name ?? '', industry: d.industry ?? '', brandVoice: d.brandVoice ?? '' }),
  feedback_items: (id, d) => ({ id, name: d.name ?? '', description: d.description ?? '', type: d.type ?? '', status: d.status ?? '', projectId: d.projectId ?? '' }),
  invoices: (id, d) => ({ id, invoiceNumber: d.invoiceNumber ?? '', status: d.status ?? '', clientId: d.clientId ?? '', date: d.date ?? '', dueDate: d.dueDate ?? '' }),
  clients: (id, d) => ({ id, name: d.name ?? '', adresse: d.adresse ?? '', ice: d.ice ?? '' }),
  drive_files: (id, d) => ({ 
    id, 
    name: d.name ?? '', 
    mimeType: d.mimeType ?? d.type ?? '', 
    webViewLink: d.webViewLink ?? '', 
    modifiedTime: d.modifiedTime ?? d.uploadedAt ?? '', 
    folderPath: d.folderPath ?? '' 
  })
};

const MAX_FAILURES_BEFORE_ALERT = 3;

async function acquireLock(): Promise<boolean> {
  const lockRef = db.collection('search_job_locks').doc('sync_job_lock');
  try {
    return await db.runTransaction(async (t) => {
      const doc = await t.get(lockRef);
      if (doc.exists) {
        const data = doc.data()!;
        const acquiredAt = data.acquiredAt.toMillis();
        // Lock expires in 5 minutes
        if (Date.now() - acquiredAt < 5 * 60 * 1000) {
          return false;
        }
      }
      t.set(lockRef, { acquiredAt: admin.firestore.FieldValue.serverTimestamp() });
      return true;
    });
  } catch (err) {
    console.warn('[searchSyncJob] Failed to acquire lock:', err);
    return false;
  }
}

async function releaseLock(): Promise<void> {
  try {
    await db.collection('search_job_locks').doc('sync_job_lock').delete();
  } catch (err) {
    console.error('[searchSyncJob] Failed to release lock:', err);
  }
}

async function processIndexSync(indexName: string, collectionName: string) {
  console.log(`[searchSyncJob] Starting sync for index: ${indexName} from collection: ${collectionName}`);
  const startMs = Date.now();
  
  let checkpoint = await getSyncCheckpoint(indexName);
  if (!checkpoint) {
    await initializeSyncCheckpoint(indexName);
    checkpoint = (await getSyncCheckpoint(indexName))!;
  }

  const mapDoc = INDEX_MAPPINGS[collectionName];
  if (!mapDoc) {
    console.error(`[searchSyncJob] No mapping defined for collection ${collectionName}`);
    return;
  }

  try {
    const { upsert, delete: toDelete } = await queryChangedDocuments(collectionName, checkpoint.lastSyncAt, mapDoc);

    if (upsert.length === 0 && toDelete.length === 0) {
      console.log(`[searchSyncJob] No changes detected for ${indexName}.`);
      await updateSyncCheckpoint(indexName, { lastSyncAt: startMs });
      return;
    }

    // 1. Bulk Upsert
    if (upsert.length > 0) {
      await bulkUpsert(indexName, upsert);
    }

    // 2. Process Deletes
    for (const docId of toDelete) {
        try {
            await deleteDocument(indexName, docId);
        } catch (delErr) {
            console.warn(`[searchSyncJob] Failed to delete ${docId} from ${indexName}:`, delErr);
        }
    }

    const duration = Date.now() - startMs;
    const recordsProcessed = upsert.length + toDelete.length;

    // Update checkpoint
    await updateSyncCheckpoint(indexName, {
      lastSyncAt: startMs,
      lastSyncedDocCount: recordsProcessed,
      consecutiveFailures: 0
    });

    // Log event
    await logSyncEvent({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      event: 'search_sync',
      indexName,
      status: 'succeeded',
      duration,
      recordsCreated: upsert.length, // Simplified mapping: new/updates go as upserts
      recordsUpdated: 0,
      recordsDeleted: toDelete.length,
      recordsSkipped: 0
    });

  } catch (error: any) {
    console.error(`[searchSyncJob] Failed to sync ${indexName}:`, error);

    const failures = checkpoint.consecutiveFailures + 1;
    await updateConsecutiveFailures(indexName, failures);

    // Partial error logging
    await logSyncEvent({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      event: 'search_sync',
      indexName,
      status: 'failed',
      duration: Date.now() - startMs,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsDeleted: 0,
      recordsSkipped: 0,
      error: error.message || String(error)
    });

    if (failures >= MAX_FAILURES_BEFORE_ALERT) {
      await triggerSyncAlert(indexName, failures, error.message);
    }
  }
}

export async function runSearchSyncJob() {
  const locked = await acquireLock();
  if (!locked) {
    console.log('[searchSyncJob] Another instance is running or locked. Skipping this cycle.');
    return;
  }

  try {
    // Process all indexes
    const indexes = Object.keys(INDEX_MAPPINGS);
    for (const idx of indexes) {
        await processIndexSync(idx, idx);
    }
  } catch (err) {
    console.error('[searchSyncJob] Job execution failed:', err);
  } finally {
    await releaseLock();
  }
}

// Ensure the process starts the job on an interval
if (require.main === module) {
  const customInterval = process.env.SEARCH_SYNC_INTERVAL_MS ? parseInt(process.env.SEARCH_SYNC_INTERVAL_MS, 10) : 3 * 60 * 1000;
  console.log(`[searchSyncJob] Scheduling batch sync job every ${customInterval}ms...`);
  
  // Run immediately on start
  runSearchSyncJob().then(() => {
    setInterval(() => {
        runSearchSyncJob();
    }, customInterval);
  });
}
