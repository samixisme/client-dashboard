import 'dotenv/config';
import { getMeili } from '../api/meiliClient';
import { configureIndexes } from '../api/searchConfig';

async function configure() {
  console.log('Configuring Meilisearch Indexes...');
  try {
    await configureIndexes();
    console.log('Configuration successful.');
  } catch (error: any) {
    console.error('Failed to configure indexes:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  configure();
}
