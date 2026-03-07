/**
 * Full-sync script: pushes all Firestore collections + Google Drive files to Meilisearch.
 * Run with: npm run search:sync
 */
import 'dotenv/config';
import * as path from 'path';
// Resolve .env relative to repo root regardless of CWD
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import { meili, getMeili } from './meiliClient';
import { INDEX_CONFIGS } from './searchConfig';

// ── Firebase Admin init (mirrors api/firebaseAdmin.ts pattern) ────────────────
if (!admin.apps.length) {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '/home/clientdash/.firebase-admin.json';
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('Firebase service account not found at:', serviceAccountPath);
    process.exit(1);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://client-dashboard-v2-default-rtdb.europe-west1.firebasedatabase.app',
  });
}
const db = admin.firestore();

// ── Sync Types & Utils ────────────────────────────────────────────────────────

export interface SearchTask {
  uid: number;
  status: 'enqueued' | 'processing' | 'succeeded' | 'failed';
  progress?: { processed: number; total: number };
  completedAt?: number;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function withRetry<T>(operation: () => Promise<T>, maxRetries = 5): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (err: any) {
      if (attempt >= maxRetries) {
        console.error(`[searchSync] Operation failed after ${maxRetries} retries:`, err);
        throw err;
      }
      const delay = 100 * Math.pow(2, attempt); // 100ms, 200ms, 400ms, 800ms, 1600ms
      console.warn(`[searchSync] Transient error, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries}):`, err.message || err);
      await sleep(delay);
      attempt++;
    }
  }
}

export async function waitForTask(taskUid: number, timeoutMs = 60000): Promise<SearchTask> {
  const client = getMeili();
  const start = Date.now();
  let backoffMs = 100;

  while (Date.now() - start < timeoutMs) {
    const task = await client.getTask(taskUid);
    
    if (task.status === 'succeeded' || task.status === 'failed') {
      if (task.status === 'failed') {
        throw new Error(`[searchSync] Task ${taskUid} failed: ${task.error?.message}`);
      }
      return {
        uid: task.uid,
        status: task.status as any,
        completedAt: Date.now(),
      };
    }

    await sleep(backoffMs);
    backoffMs = Math.min(backoffMs * 2, 400);
  }
  
  throw new Error(`[searchSync] waitForTask timed out after ${timeoutMs}ms for task ${taskUid}`);
}

// ── Core Sync Operations ──────────────────────────────────────────────────────

export async function upsertDocument(indexName: string, document: Record<string, any>): Promise<SearchTask> {
  if (!document.id) {
    throw new Error(`[searchSync] Cannot upsert document without an 'id' field in index ${indexName}`);
  }
  
  const start = Date.now();
  console.log(`[searchSync] Upserting document ${document.id} into ${indexName}...`);
  
  const client = getMeili();
  const index = client.index(indexName);

  const task = await withRetry(() => index.addDocuments([document]));
  
  console.log(`[searchSync] Upserted 1 document into ${indexName} in ${Date.now() - start}ms`);
  
  return {
    uid: task.taskUid,
    status: task.status as any,
  };
}

export async function deleteDocument(indexName: string, documentId: string): Promise<SearchTask> {
  const start = Date.now();
  console.log(`[searchSync] Deleting document ${documentId} from ${indexName}...`);
  
  const client = getMeili();
  const index = client.index(indexName);

  const task = await withRetry(() => index.deleteDocument(documentId));
  
  console.log(`[searchSync] Deleted document ${documentId} from ${indexName} in ${Date.now() - start}ms`);
  
  return {
    uid: task.taskUid,
    status: task.status as any,
  };
}

export async function bulkUpsert(indexName: string, documents: Record<string, any>[]): Promise<SearchTask> {
  const BATCH_SIZE = 10000;
  const start = Date.now();
  console.log(`[searchSync] Bulk upserting ${documents.length} docs to ${indexName} in batches of ${BATCH_SIZE}...`);
  
  const client = getMeili();
  const index = client.index(indexName);

  let lastTaskUid = -1;
  let lastStatus = 'succeeded';

  if (documents.length === 0) {
    return { uid: -1, status: 'succeeded', completedAt: Date.now() };
  }

  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    
    if (batch.some(d => !d.id)) {
      throw new Error(`[searchSync] Cannot bulk upsert documents without an 'id' field in index ${indexName}`);
    }

    console.log(`[searchSync] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(documents.length / BATCH_SIZE)}`);
    const task = await withRetry(() => index.addDocuments(batch));
    lastTaskUid = task.taskUid;
    lastStatus = task.status;
    
    // Wait for batch to complete
    await waitForTask(task.taskUid);
  }
  
  const duration = Date.now() - start;
  console.log(`[searchSync] Bulk upsert complete for ${documents.length} docs in ${duration}ms`);
  
  return {
    uid: lastTaskUid,
    status: lastStatus as any,
    progress: { processed: documents.length, total: documents.length },
    completedAt: Date.now(),
  };
}

export async function fullReindex(indexName: string, documents: Record<string, any>[]): Promise<SearchTask> {
  const start = Date.now();
  console.log(`[searchSync] Full reindex started for ${indexName} (${documents.length} docs)...`);
  
  const client = getMeili();
  const index = client.index(indexName);

  // Clear index
  const clearTask = await withRetry(() => index.deleteAllDocuments());
  await waitForTask(clearTask.taskUid);
  console.log(`[searchSync] Cleared old index data in ${indexName}`);

  // Bulk upsert new documents
  const bulkTask = await bulkUpsert(indexName, documents);
  
  const duration = Date.now() - start;
  console.log(`[searchSync] Full reindex for ${indexName} completed in ${duration}ms`);
  return bulkTask;
}

// ── Legacy Helpers ─────────────────────────────────────────────────────────────

async function syncCollection(
  collectionName: string,
  indexName: string,
  mapDoc: (id: string, data: admin.firestore.DocumentData) => Record<string, unknown>,
) {
  const snap = await db.collection(collectionName).get();
  const docs = snap.docs.map((d) => mapDoc(d.id, d.data()));

  if (docs.length === 0) {
    console.log(`  [${indexName}] 0 docs — skipping`);
    return;
  }

  const index = getMeili().index(indexName);
  await index.updateSettings(INDEX_CONFIGS[indexName] as any); // Apply correct config
  await fullReindex(indexName, docs);
}

// ── Drive files sync ──────────────────────────────────────────────────────────

async function syncDriveFiles() {
  let files: Record<string, unknown>[];
  try {
    const { listFiles } = await import('../utils/googleDrive');
    files = await listFiles('');
  } catch (err) {
    console.warn('  [drive_files] Could not list Drive files — skipping:', err);
    return;
  }

  const docs = files.map((f: Record<string, unknown>) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    webViewLink: f.webViewLink,
    modifiedTime: f.modifiedTime,
    folderPath: f.folderPath ?? '',
  }));

  if (docs.length === 0) {
    console.log('  [drive_files] 0 files — skipping');
    return;
  }

  const index = getMeili().index('drive_files');
  await index.updateSettings(INDEX_CONFIGS['drive_files'] as any);
  await fullReindex('drive_files', docs);
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function runFullSync() {
  console.log('Starting Meilisearch full sync…');

  await syncCollection('projects', 'projects', (id, d) => ({
    id,
    name: d.name ?? '',
    description: d.description ?? '',
    status: d.status ?? '',
    brandId: d.brandId ?? '',
  }));

  await syncCollection('tasks', 'tasks', (id, d) => ({
    id,
    title: d.title ?? '',
    description: d.description ?? '',
    priority: d.priority ?? '',
    status: d.status ?? '',
    dueDate: d.dueDate ?? '',
    boardId: d.boardId ?? '',
  }));

  await syncCollection('brands', 'brands', (id, d) => ({
    id,
    name: d.name ?? '',
    industry: d.industry ?? '',
    brandVoice: d.brandVoice ?? '',
  }));

  // feedback_items live in various sub-documents; try top-level collection
  await syncCollection('feedback_items', 'feedback_items', (id, d) => ({
    id,
    name: d.name ?? '',
    description: d.description ?? '',
    type: d.type ?? '',
    status: d.status ?? '',
    projectId: d.projectId ?? '',
  }));

  await syncCollection('invoices', 'invoices', (id, d) => ({
    id,
    invoiceNumber: d.invoiceNumber ?? '',
    status: d.status ?? '',
    clientId: d.clientId ?? '',
    date: d.date ?? '',
    dueDate: d.dueDate ?? '',
  }));

  await syncCollection('clients', 'clients', (id, d) => ({
    id,
    name: d.name ?? '',
    adresse: d.adresse ?? '',
    ice: d.ice ?? '',
  }));

  await syncDriveFiles();

  console.log('Full sync complete.');
}

// Allow direct execution: tsx api/searchSync.ts
if (require.main === module) {
  runFullSync()
    .then(() => admin.app().delete())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Sync failed:', err);
      process.exit(1);
    });
}

