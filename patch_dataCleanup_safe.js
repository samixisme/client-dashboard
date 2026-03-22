const fs = require('fs');

const content = `import {
    collection,
    getDocs,
    deleteDoc,
    doc,
    query,
    where,
    writeBatch,
    collectionGroup,
    DocumentReference
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Helper to delete an array of DocumentReferences in batches.
 */
const deleteDocumentsInBatches = async (docRefs: DocumentReference[]) => {
    const batchSize = 500;
    for (let i = 0; i < docRefs.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = docRefs.slice(i, i + batchSize);
        chunk.forEach(ref => batch.delete(ref));
        await batch.commit();
    }
};

/**
 * Helper to collect all documents in a collection and add their refs to an array.
 */
const collectCollectionRefs = async (collectionPath: string, refsArray: DocumentReference[]) => {
    const colRef = collection(db, collectionPath);
    const snapshot = await getDocs(colRef);
    snapshot.docs.forEach(docSnap => refsArray.push(docSnap.ref as DocumentReference));
};

/**
 * Helper to delete all documents in a collection (shallow delete) using batches.
 */
const deleteCollection = async (collectionPath: string) => {
    const refs: DocumentReference[] = [];
    await collectCollectionRefs(collectionPath, refs);
    await deleteDocumentsInBatches(refs);
};

/**
 * Recursively deletes a project and all its related subcollections and global references.
 */
export const deleteProjectDeep = async (projectId: string) => {
    try {
        const refsToDelete: DocumentReference[] = [];

        // 1. Delete Subcollections

        // A. Feedback Items
        const feedbackItemsSnap = await getDocs(collection(db, 'projects', projectId, 'feedbackItems'));
        for (const itemDoc of feedbackItemsSnap.docs) {
            await collectCollectionRefs(\`projects/\${projectId}/feedbackItems/\${itemDoc.id}/comments\`, refsToDelete);
            refsToDelete.push(itemDoc.ref as DocumentReference);
        }

        // B. Boards (and nested)
        const boardsSnap = await getDocs(collection(db, 'projects', projectId, 'boards'));
        for (const boardDoc of boardsSnap.docs) {
             const boardStagesSnap = await getDocs(query(collection(db, 'stages'), where('boardId', '==', boardDoc.id)));
             for (const stageDoc of boardStagesSnap.docs) {
                 refsToDelete.push(stageDoc.ref as DocumentReference);
             }
             const boardTasksSnap = await getDocs(query(collection(db, 'tasks'), where('boardId', '==', boardDoc.id)));
             for (const taskSnap of boardTasksSnap.docs) {
                 await collectTaskRefs(taskId(taskSnap), refsToDelete);
             }

             await collectCollectionRefs(\`projects/\${projectId}/boards/\${boardDoc.id}/tags\`, refsToDelete);
             refsToDelete.push(boardDoc.ref as DocumentReference);
        }

        // C. Moodboards (and items)
        const moodboardsSnap = await getDocs(collection(db, 'projects', projectId, 'moodboards'));
        for (const mbDoc of moodboardsSnap.docs) {
            await collectCollectionRefs(\`projects/\${projectId}/moodboards/\${mbDoc.id}/moodboard_items\`, refsToDelete);
            refsToDelete.push(mbDoc.ref as DocumentReference);
        }

        // D. Other direct subcollections
        await collectCollectionRefs(\`projects/\${projectId}/activities\`, refsToDelete);
        await collectCollectionRefs(\`projects/\${projectId}/roadmap\`, refsToDelete);

        // 2. Delete Global References (orphaned data)
        const globalTasksQuery = query(collection(db, 'tasks'), where('projectId', '==', projectId));
        const globalTasksSnap = await getDocs(globalTasksQuery);
        globalTasksSnap.forEach(d => refsToDelete.push(d.ref as DocumentReference));

        const globalActivitiesQuery = query(collection(db, 'activities'), where('projectId', '==', projectId));
        const globalActivitiesSnap = await getDocs(globalActivitiesQuery);
        globalActivitiesSnap.forEach(d => refsToDelete.push(d.ref as DocumentReference));

        const eventsQuery = query(collection(db, 'events'), where('projectId', '==', projectId));
        const eventsSnap = await getDocs(eventsQuery);
        eventsSnap.forEach(d => refsToDelete.push(d.ref as DocumentReference));

        // 3. Finally, add the Project document itself
        refsToDelete.push(doc(db, 'projects', projectId) as DocumentReference);

        // Execute batch deletion
        await deleteDocumentsInBatches(refsToDelete);
    } catch (error) {
        console.error(\`Error deleting project \${projectId}:\`, error);
        throw error;
    }
};

/**
 * Internal helper to collect task and subcollection refs
 */
const collectTaskRefs = async (taskId: string, refsArray: DocumentReference[]) => {
    const commentsSnap = await getDocs(query(collection(db, 'comments'), where('taskId', '==', taskId)));
    commentsSnap.forEach(d => refsArray.push(d.ref as DocumentReference));

    const timeLogsSnap = await getDocs(query(collection(db, 'time_logs'), where('taskId', '==', taskId)));
    timeLogsSnap.forEach(d => refsArray.push(d.ref as DocumentReference));

    refsArray.push(doc(db, 'tasks', taskId) as DocumentReference);
};

// Helper for extracting task ID safely from snap (local to file)
const taskId = (snap: any) => snap.id;

/**
 * Deletes a Task and its subcollections (comments, time_logs).
 */
export const deleteTaskDeep = async (projectId: string, boardId: string, taskId: string) => {
    try {
        const refsToDelete: DocumentReference[] = [];
        await collectTaskRefs(taskId, refsToDelete);
        await deleteDocumentsInBatches(refsToDelete);
    } catch (error) {
        console.error(\`Error deleting task deep \${taskId}:\`, error);
        throw error;
    }
};

/**
 * Deletes a Stage and all tasks within it.
 */
export const deleteStageDeep = async (projectId: string, boardId: string, stageId: string) => {
    try {
        const refsToDelete: DocumentReference[] = [];

        const tasksQuery = query(
            collection(db, 'tasks'),
            where('stageId', '==', stageId)
        );
        const tasksSnap = await getDocs(tasksQuery);

        for (const taskDoc of tasksSnap.docs) {
            await collectTaskRefs(taskDoc.id, refsToDelete);
        }

        refsToDelete.push(doc(db, 'stages', stageId) as DocumentReference);
        await deleteDocumentsInBatches(refsToDelete);
    } catch (error) {
        console.error(\`Error deleting stage deep \${stageId}:\`, error);
        throw error;
    }
};

/**
 * Deletes a Board and all its content (Stages, Tasks, etc).
 */
export const deleteBoardDeep = async (projectId: string, boardId: string) => {
    try {
        const refsToDelete: DocumentReference[] = [];
        const boardPath = \`projects/\${projectId}/boards/\${boardId}\`;

        const boardStagesSnap = await getDocs(query(collection(db, 'stages'), where('boardId', '==', boardId)));
        for (const stageDoc of boardStagesSnap.docs) {
             refsToDelete.push(stageDoc.ref as DocumentReference);
        }

        const tasksSnap = await getDocs(query(collection(db, 'tasks'), where('boardId', '==', boardId)));
        for (const t of tasksSnap.docs) {
             await collectTaskRefs(t.id, refsToDelete);
        }

        await collectCollectionRefs(\`\${boardPath}/tags\`, refsToDelete);
        refsToDelete.push(doc(db, boardPath) as DocumentReference);

        await deleteDocumentsInBatches(refsToDelete);
    } catch (error) {
        console.error(\`Error deleting board deep \${boardId}:\`, error);
        throw error;
    }
};

/**
 * Scans for and deletes data that references non-existent projects.
 * Useful for cleaning up "old/stale" data.
 */
export const purgeStaleData = async () => {
    let deletedCount = 0;

    try {
        const projectsSnap = await getDocs(collection(db, 'projects'));
        const validProjectIds = new Set(projectsSnap.docs.map(d => d.id));

        const collectionsToCheck = ['tasks', 'activities', 'events'];

        for (const colName of collectionsToCheck) {
            const snap = await getDocs(collection(db, colName));
            const batch = writeBatch(db);
            let batchCount = 0;

            for (const doc of snap.docs) {
                const data = doc.data();
                if (data.projectId && !validProjectIds.has(data.projectId)) {
                    batch.delete(doc.ref);
                    deletedCount++;
                    batchCount++;
                }
            }
            if (batchCount > 0) await batch.commit();
        }

        const boardsSnap = await getDocs(collectionGroup(db, 'boards'));
        for (const boardDoc of boardsSnap.docs) {
             const projectRef = boardDoc.ref.parent.parent;
             if (projectRef && !validProjectIds.has(projectRef.id)) {
                 await deleteBoardDeep(projectRef.id, boardDoc.id);
                 deletedCount++;
             }
        }

        const feedbackSnap = await getDocs(collectionGroup(db, 'feedbackItems'));
        for (const itemDoc of feedbackSnap.docs) {
             const projectRef = itemDoc.ref.parent.parent;
             if (projectRef && !validProjectIds.has(projectRef.id)) {
                  await deleteCollection(\`\${itemDoc.ref.path}/comments\`);
                  await deleteDoc(itemDoc.ref);
                  deletedCount++;
             }
        }

        const moodboardsSnap = await getDocs(collectionGroup(db, 'moodboards'));
        for (const mbDoc of moodboardsSnap.docs) {
             const projectRef = mbDoc.ref.parent.parent;
             if (projectRef && !validProjectIds.has(projectRef.id)) {
                 await deleteCollection(\`\${mbDoc.ref.path}/moodboard_items\`);
                 await deleteDoc(mbDoc.ref);
                 deletedCount++;
             }
        }

        const roadmapSnap = await getDocs(collectionGroup(db, 'roadmap'));
        for (const rmDoc of roadmapSnap.docs) {
             const projectRef = rmDoc.ref.parent.parent;
             if (projectRef && !validProjectIds.has(projectRef.id)) {
                 await deleteDoc(rmDoc.ref);
                 deletedCount++;
             }
        }

        return deletedCount;
    } catch (error) {
        console.error("Error purging stale data:", error);
        throw error;
    }
};
`;

fs.writeFileSync('utils/dataCleanup.ts', content);
