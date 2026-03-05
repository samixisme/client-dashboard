import { performance } from 'perf_hooks';

// Mock DB
const db = {
  batch: () => ({
    delete: () => {},
    commit: async () => {}
  }),
  collection: (name: string) => ({
    where: (field: string, op: string, val: string) => ({
      where: (field2: string, op2: string, val2: string) => ({
        get: async () => {
          await new Promise(resolve => setTimeout(resolve, 50)); // simulate 50ms latency
          return {
            forEach: (cb: any) => cb({ ref: 'mock_ref' })
          };
        }
      })
    })
  })
};

async function sequential() {
  const batch = db.batch();
  let deletionCount = 0;
  const platformUserId = 'test';

  const accountSnapshot = await db.collection('socialAccounts')
    .where('platform', '==', 'facebook')
    .where('platformUserId', '==', platformUserId)
    .get();

  accountSnapshot.forEach((doc: any) => {
    batch.delete();
    deletionCount++;
  });

  const commentsSnapshot = await db.collection('socialComments')
    .where('platform', '==', 'facebook')
    .where('from.id', '==', platformUserId)
    .get();

  commentsSnapshot.forEach((doc: any) => {
    batch.delete();
    deletionCount++;
  });

  const messagesSnapshot = await db.collection('socialMessages')
    .where('platform', '==', 'facebook')
    .where('from.id', '==', platformUserId)
    .get();

  messagesSnapshot.forEach((doc: any) => {
    batch.delete();
    deletionCount++;
  });

  const postsSnapshot = await db.collection('socialPosts')
    .where('platform', '==', 'facebook')
    .where('platformUserId', '==', platformUserId)
    .get();

  postsSnapshot.forEach((doc: any) => {
    batch.delete();
    deletionCount++;
  });

  const mentionsSnapshot = await db.collection('socialMentions')
    .where('platform', '==', 'facebook')
    .where('from.id', '==', platformUserId)
    .get();

  mentionsSnapshot.forEach((doc: any) => {
    batch.delete();
    deletionCount++;
  });

  await batch.commit();
}

async function concurrent() {
  const batch = db.batch();
  let deletionCount = 0;
  const platformUserId = 'test';

  const [
    accountSnapshot,
    commentsSnapshot,
    messagesSnapshot,
    postsSnapshot,
    mentionsSnapshot
  ] = await Promise.all([
    db.collection('socialAccounts')
      .where('platform', '==', 'facebook')
      .where('platformUserId', '==', platformUserId)
      .get(),
    db.collection('socialComments')
      .where('platform', '==', 'facebook')
      .where('from.id', '==', platformUserId)
      .get(),
    db.collection('socialMessages')
      .where('platform', '==', 'facebook')
      .where('from.id', '==', platformUserId)
      .get(),
    db.collection('socialPosts')
      .where('platform', '==', 'facebook')
      .where('platformUserId', '==', platformUserId)
      .get(),
    db.collection('socialMentions')
      .where('platform', '==', 'facebook')
      .where('from.id', '==', platformUserId)
      .get()
  ]);

  const processSnapshot = (snapshot: any) => {
    snapshot.forEach((doc: any) => {
      batch.delete();
      deletionCount++;
    });
  };

  processSnapshot(accountSnapshot);
  processSnapshot(commentsSnapshot);
  processSnapshot(messagesSnapshot);
  processSnapshot(postsSnapshot);
  processSnapshot(mentionsSnapshot);

  await batch.commit();
}

async function run() {
  const startSeq = performance.now();
  await sequential();
  const endSeq = performance.now();
  console.log(`Sequential: ${endSeq - startSeq}ms`);

  const startConc = performance.now();
  await concurrent();
  const endConc = performance.now();
  console.log(`Concurrent: ${endConc - startConc}ms`);
}

run();
