import * as admin from 'firebase-admin';

// Initialize Firebase if not already
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

export interface SyncCheckpoint {
  indexName: string;
  lastSyncAt: number; // Unix timestamp
  lastSyncedDocCount: number;
  consecutiveFailures: number;
  nextScheduledSyncAt: number;
  updatedAt?: admin.firestore.Timestamp;
}

/**
 * Get the current sync checkpoint for an index.
 */
export async function getSyncCheckpoint(indexName: string): Promise<SyncCheckpoint | null> {
  const docSnap = await db.collection('search_sync_checkpoints').doc(indexName).get();
  if (!docSnap.exists) {
    return null;
  }
  return docSnap.data() as SyncCheckpoint;
}

/**
 * Initialize a new sync checkpoint for an index.
 */
export async function initializeSyncCheckpoint(indexName: string): Promise<void> {
  const initial: SyncCheckpoint = {
    indexName,
    lastSyncAt: 0,
    lastSyncedDocCount: 0,
    consecutiveFailures: 0,
    nextScheduledSyncAt: 0,
    updatedAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
  };
  await db.collection('search_sync_checkpoints').doc(indexName).set(initial, { merge: true });
}

/**
 * Update a sync checkpoint with new data idempotently.
 */
export async function updateSyncCheckpoint(indexName: string, data: Partial<SyncCheckpoint>): Promise<void> {
  const updateData = {
    ...data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await db.collection('search_sync_checkpoints').doc(indexName).set(updateData, { merge: true });
}

/**
 * Update the consecutive failures counter.
 */
export async function updateConsecutiveFailures(indexName: string, count: number): Promise<void> {
  await db.collection('search_sync_checkpoints').doc(indexName).set(
    {
      consecutiveFailures: count,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
