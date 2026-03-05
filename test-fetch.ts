const preFetchedUsers = [ { id: '1', name: 'User 1' }, { id: '2', name: 'User 2' } ];

async function measure() {
  const startTime = Date.now();
  try {
    // Simulating Firebase Firestore roundtrip (150ms-300ms typical)
    await new Promise(resolve => setTimeout(resolve, 200));
    const fetchedUsers = preFetchedUsers;
    const endTime = Date.now();
    console.log(`[Baseline] Fetched ${fetchedUsers.length} users in ${endTime - startTime}ms (simulated I/O)`);
  } catch (error) {
    console.error("Error fetching users:", error);
  }

  const memStartTime = Date.now();
  const users = preFetchedUsers;
  const memEndTime = Date.now();
  console.log(`[Optimized] Accessed users from memory in ${memEndTime - memStartTime}ms`);
}

measure();
