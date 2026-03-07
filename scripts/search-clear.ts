import 'dotenv/config';
import { getMeili } from '../api/meiliClient';
import { createInterface } from 'readline';

async function clear() {
  const index = process.argv[2];
  
  if (!index) {
    console.error('Please provide an index to clear, or "all" to clear all indexes.');
    console.error('Usage: npx tsx scripts/search-clear.ts <index_name|all>');
    process.exit(1);
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(`Are you sure you want to clear documents in '${index}'? (y/N): `, async (answer) => {
    rl.close();
    if (answer.toLowerCase() !== 'y') {
      console.log('Operation cancelled.');
      return;
    }

    try {
      const client = getMeili();
      if (index === 'all') {
        console.log('Clearing all indexes...');
        const indexes = await client.getIndexes();
        for (const idx of indexes.results) {
          const task = await client.index(idx.uid).deleteAllDocuments();
          console.log(`Task ${task.taskUid} enqueued to clear ${idx.uid}`);
        }
      } else {
        const task = await client.index(index).deleteAllDocuments();
        console.log(`Task ${task.taskUid} enqueued to clear docs in ${index}`);
      }
    } catch (error: any) {
      console.error('Failed to clear index:', error.message);
      process.exit(1);
    }
  });
}

if (require.main === module) {
  clear();
}
