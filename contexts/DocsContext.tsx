import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    addDoc,
    updateDoc as firestoreUpdateDoc,
    deleteDoc as firestoreDeleteDoc,
    doc,
    getDocs,
    writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Doc, DocMode } from '../types';
import { toast } from 'sonner';

interface DocsContextType {
    docs: Doc[];
    docsLoading: boolean;
    createDoc: (projectId: string, brandId: string, mode: DocMode, title?: string, emoji?: string) => Promise<string | null>;
    updateDoc: (docId: string, updates: Partial<Pick<Doc, 'title' | 'emoji' | 'mode' | 'isPinned' | 'linkedBoardId'>>) => Promise<void>;
    deleteDoc: (docId: string) => Promise<void>;
    getProjectDocs: (projectId: string) => Doc[];
}

const DocsContext = createContext<DocsContextType | undefined>(undefined);

export const DocsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [docs, setDocs] = useState<Doc[]>([]);
    const [docsLoading, setDocsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    // Track auth state — mirrors pattern in DataContext
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, user => {
            setUserId(user?.uid ?? null);
        });
        return () => unsub();
    }, []);

    // Real-time Firestore listener on /docs ordered by updatedAt desc
    useEffect(() => {
        if (!userId) {
            setDocs([]);
            setDocsLoading(false);
            return;
        }

        const q = query(
            collection(db, 'docs'),
            orderBy('updatedAt', 'desc')
        );

        const unsub = onSnapshot(
            q,
            snapshot => {
                const loaded: Doc[] = snapshot.docs.map(d => ({
                    id: d.id,
                    ...(d.data() as Omit<Doc, 'id'>),
                }));
                setDocs(loaded);
                setDocsLoading(false);
            },
            () => {
                setDocsLoading(false);
            }
        );

        return () => unsub();
    }, [userId]);

    const createDoc = useCallback(async (
        projectId: string,
        brandId: string,
        mode: DocMode,
        title = 'Untitled',
        emoji?: string
    ): Promise<string | null> => {
        if (!userId) return null;
        try {
            const now = new Date().toISOString();
            const ref = await addDoc(collection(db, 'docs'), {
                projectId,
                brandId,
                title,
                mode,
                emoji: emoji ?? (mode === 'edgeless' ? '🖼️' : '📄'),
                createdAt: now,
                updatedAt: now,
                createdBy: userId,
                isPinned: false,
            });
            return ref.id;
        } catch {
            toast.error('Failed to create document');
            return null;
        }
    }, [userId]);

    const updateDoc = useCallback(async (
        docId: string,
        updates: Partial<Pick<Doc, 'title' | 'emoji' | 'mode' | 'isPinned' | 'linkedBoardId'>>
    ): Promise<void> => {
        try {
            await firestoreUpdateDoc(doc(db, 'docs', docId), {
                ...updates,
                updatedAt: new Date().toISOString(),
            });
        } catch {
            toast.error('Failed to update document');
        }
    }, []);

    const deleteDoc = useCallback(async (docId: string): Promise<void> => {
        try {
            // Clean up Yjs subcollections before deleting the parent doc.
            // Firestore does not cascade-delete subcollections automatically —
            // orphaned /updates and /snapshots would accumulate forever otherwise.
            const batch = writeBatch(db);
            const subcollections = ['updates', 'snapshots'];
            for (const sub of subcollections) {
                const snap = await getDocs(collection(db, 'docs', docId, sub));
                snap.docs.forEach(d => batch.delete(d.ref));
            }
            await batch.commit();

            await firestoreDeleteDoc(doc(db, 'docs', docId));
            toast.success('Document deleted');
        } catch {
            toast.error('Failed to delete document');
        }
    }, []);

    const getProjectDocs = useCallback(
        (projectId: string) => docs.filter(d => d.projectId === projectId),
        [docs]
    );

    return (
        <DocsContext.Provider value={{
            docs,
            docsLoading,
            createDoc,
            updateDoc,
            deleteDoc,
            getProjectDocs,
        }}>
            {children}
        </DocsContext.Provider>
    );
};

export const useDocs = (): DocsContextType => {
    const ctx = useContext(DocsContext);
    if (!ctx) throw new Error('useDocs must be used inside DocsProvider');
    return ctx;
};
