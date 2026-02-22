/**
 * Full-sync script: pushes all Firestore collections + Google Drive files to Meilisearch.
 * Run with: npm run search:sync
 */
import 'dotenv/config';
import * as path from 'path';
// Resolve .env relative to repo root regardless of CWD
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import { meili } from './meiliClient';

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

// ── Index settings ───────────────────────────────────────────────────────────
const INDEX_SETTINGS: Record<string, {
  searchableAttributes: string[];
  filterableAttributes: string[];
  sortableAttributes: string[];
}> = {
  projects: {
    searchableAttributes: ['name', 'description', 'status'],
    filterableAttributes: ['status', 'brandId'],
    sortableAttributes: [],
  },
  tasks: {
    searchableAttributes: ['title', 'description', 'priority', 'status'],
    filterableAttributes: ['status', 'priority', 'boardId'],
    sortableAttributes: ['dueDate'],
  },
  brands: {
    searchableAttributes: ['name', 'industry', 'brandVoice'],
    filterableAttributes: [],
    sortableAttributes: [],
  },
  feedback_items: {
    searchableAttributes: ['name', 'description', 'type', 'status'],
    filterableAttributes: ['status', 'type', 'projectId'],
    sortableAttributes: [],
  },
  invoices: {
    searchableAttributes: ['invoiceNumber', 'status'],
    filterableAttributes: ['status', 'clientId'],
    sortableAttributes: ['date', 'dueDate'],
  },
  clients: {
    searchableAttributes: ['name', 'adresse', 'ice'],
    filterableAttributes: [],
    sortableAttributes: [],
  },
  docs: {
    searchableAttributes: ['title', 'mode'],
    filterableAttributes: ['mode', 'projectId', 'brandId'],
    sortableAttributes: [],
  },
  drive_files: {
    searchableAttributes: ['name', 'folderPath', 'mimeType'],
    filterableAttributes: ['mimeType'],
    sortableAttributes: ['modifiedTime'],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
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

  const index = meili.index(indexName);
  await index.updateSettings(INDEX_SETTINGS[indexName]);
  await index.addDocuments(docs);
  console.log(`  [${indexName}] synced ${docs.length} docs`);
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

  const index = meili.index('drive_files');
  await index.updateSettings(INDEX_SETTINGS.drive_files);
  await index.addDocuments(docs);
  console.log(`  [drive_files] synced ${docs.length} files`);
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

  await syncCollection('docs', 'docs', (id, d) => ({
    id,
    title: d.title ?? '',
    mode: d.mode ?? '',
    projectId: d.projectId ?? '',
    brandId: d.brandId ?? '',
  }));

  await syncDriveFiles();

  console.log('Full sync complete.');
}

// Allow direct execution: tsx api/searchSync.ts
if (require.main === module) {
  runFullSync().catch((err) => {
    console.error('Sync failed:', err);
    process.exit(1);
  });
}
