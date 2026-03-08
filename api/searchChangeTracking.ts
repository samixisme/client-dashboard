import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

export interface DeltaResult {
  upsert: Record<string, any>[];
  delete: string[]; // Document IDs to delete
}

/**
 * Query Firestore for documents changed since a given timestamp.
 * Categorizes changes into upserts and deletes.
 * 
 * Includes a 1-minute overlap buffer to handle minor clock skew.
 */
export async function queryChangedDocuments(
  collectionName: string,
  sinceUnixMs: number,
  mapDoc: (id: string, data: admin.firestore.DocumentData) => Record<string, unknown>
): Promise<DeltaResult> {
  // Add 1 minute overlap for clock skew, ensure it's not negative
  const overlapMs = 60000;
  const safeSince = Math.max(0, sinceUnixMs - overlapMs);
  const sinceDate = new Date(safeSince);
  const sinceTimestamp = admin.firestore.Timestamp.fromDate(sinceDate);

  console.log(`[searchSync] Querying ${collectionName} for changes since ${sinceDate.toISOString()}`);

  // We query the collection based on the 'updatedAt' field.
  // Note: Firestore requires documents to actually have this field for the query to work.
  const snap = await db.collection(collectionName)
    .where('updatedAt', '>', sinceTimestamp)
    .get();

  const upsert: Record<string, any>[] = [];
  const del: string[] = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    
    // Check for logical deletion flags
    // Supports boolean "isDeleted", timestamp "deletedAt", or a specific "status"
    if (data.isDeleted === true || data.deletedAt != null || data.status === 'deleted') {
      del.push(doc.id);
    } else {
      try {
        const mapped = mapDoc(doc.id, data);
        if (mapped && mapped.id) {
          upsert.push(mapped);
        }
      } catch (err) {
        console.warn(`[searchSync] Failed to map document ${doc.id} in ${collectionName}:`, err);
      }
    }
  }

  console.log(`[searchSync] ${collectionName} changes: ${upsert.length} upserts, ${del.length} deletes.`);
  return { upsert, delete: del };
}
