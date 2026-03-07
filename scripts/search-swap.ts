import 'dotenv/config';
import { getMeili } from '../api/meiliClient';

async function swap() {
  const indexA = process.argv[2];
  const indexB = process.argv[3];
  
  if (!indexA || !indexB) {
    console.error('Usage: npx tsx scripts/search-swap.ts <indexA> <indexB>');
    process.exit(1);
  }

  console.log(`Swapping indexes ${indexA} and ${indexB}...`);
  try {
    const client = getMeili();
    const task = await client.swapIndexes([{ indexes: [indexA, indexB] }]);
    console.log('Swap enqueued:', task.taskUid);
  } catch (error: any) {
    console.error('Failed to swap indexes:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  swap();
}
