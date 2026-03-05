const fetch = require('node-fetch'); // Mocking fetch using node-fetch or native fetch in Node 18+

async function runSequential() {
  const start = Date.now();

  const p1 = await new Promise(resolve => setTimeout(() => resolve({ expires_in: 3600 }), 500));
  const p2 = await new Promise(resolve => setTimeout(() => resolve({ id: '123', name: 'Test' }), 500));

  const end = Date.now();
  console.log(`Sequential: ${end - start}ms`);
}

async function runParallel() {
  const start = Date.now();

  const [p1, p2] = await Promise.all([
    new Promise(resolve => setTimeout(() => resolve({ expires_in: 3600 }), 500)),
    new Promise(resolve => setTimeout(() => resolve({ id: '123', name: 'Test' }), 500))
  ]);

  const end = Date.now();
  console.log(`Parallel: ${end - start}ms`);
}

async function main() {
  await runSequential();
  await runParallel();
}

main();
