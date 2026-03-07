import 'dotenv/config';
import { getMeili } from '../api/meiliClient';

async function status() {
  console.log('Checking Meilisearch Status...');
  try {
    const client = getMeili();
    const health = await client.health();
    console.log('Service Health:', health);

    const stats = await client.getStats();
    console.log('Index Stats:');
    for (const [indexUid, indexStat] of Object.entries(stats.indexes)) {
      console.log(` - ${indexUid}: ${indexStat.numberOfDocuments} docs`);
    }
  } catch (error: any) {
    console.error('Failed to get status:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  status();
}
