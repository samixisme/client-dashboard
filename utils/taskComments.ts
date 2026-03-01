import { collection, addDoc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { extractMentions } from './mentionParser';

export interface TaskComment {
    id: string;
    taskId: string;
    text: string;
    authorId: string;
    authorName: string;
    mentions: string[];
    attachmentUrls: string[];
    createdAt: string;
}

export function subscribeToTaskComments(
    taskId: string,
    callback: (comments: TaskComment[]) => void
): () => void {
    const ref = query(
        collection(db, 'tasks', taskId, 'comments'),
        orderBy('createdAt', 'asc')
    );
    return onSnapshot(ref, snap =>
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskComment)))
    );
}

export async function addTaskComment(
    taskId: string,
    text: string,
    authorId: string,
    authorName: string,
    attachmentUrls: string[] = []
): Promise<void> {
    await addDoc(collection(db, 'tasks', taskId, 'comments'), {
        taskId,
        text,
        authorId,
        authorName,
        mentions: extractMentions(text),
        attachmentUrls,
        createdAt: serverTimestamp(),
    });
}
