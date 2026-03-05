import { db } from './utils/firebase.ts';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

async function measureBulkFetch() {
    const start = Date.now();
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const end = Date.now();
        console.log(`[Baseline] Fetched ${users.length} users in ${end - start} ms.`);
    } catch (error) {
        console.error("Error fetching users:", error);
    }
}

async function measureTargetedFetch(userIds: string[]) {
    const start = Date.now();
    try {
        const uniqueUserIds = [...new Set(userIds)];
        const chunks = [];
        for (let i = 0; i < uniqueUserIds.length; i += 30) {
            chunks.push(uniqueUserIds.slice(i, i + 30));
        }

        for (const chunk of chunks) {
            await Promise.all(chunk.map(id => getDoc(doc(db, 'users', id))));
        }

        const end = Date.now();
        console.log(`[Targeted] Fetched ${uniqueUserIds.length} specific users in ${end - start} ms.`);
    } catch (error) {
        console.error("Error fetching users:", error);
    }
}

async function run() {
    await measureBulkFetch();
    await measureTargetedFetch(['user1', 'user2', 'user3']);
    process.exit(0);
}

run();
