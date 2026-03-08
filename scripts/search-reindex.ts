import 'dotenv/config';
import { runFullSync } from '../api/searchSync';
import * as admin from 'firebase-admin';

async function reindex() {
  console.log('Starting full reindex...');
  try {
    await runFullSync();
    console.log('Reindexing triggered successfully.');
  } catch (error: any) {
    console.error('Failed to reindex:', error.message);
    process.exit(1);
  } finally {
    if (admin.apps.length) await admin.app().delete();
  }
}

if (require.main === module) {
  reindex();
}
