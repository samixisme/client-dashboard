import * as Y from 'yjs';
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    getDocs,
    writeBatch,
    doc,
    setDoc,
    deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';

const UPDATE_COMPACTION_THRESHOLD = 500;

const MAX_YJS_UPDATE_BYTES = 500_000; // 500 KB sanity cap per update

function safeApplyUpdate(yDoc: Y.Doc, rawData: unknown, origin: string, context: string): void {
    if (!Array.isArray(rawData) || rawData.length === 0) return;
    if (rawData.length > MAX_YJS_UPDATE_BYTES) {
        console.warn(`[FirebaseYjsProvider] ${context}: oversized update (${rawData.length} bytes) — skipped`);
        return;
    }
    try {
        Y.applyUpdate(yDoc, new Uint8Array(rawData as number[]), origin);
    } catch (err) {
        console.warn(`[FirebaseYjsProvider] ${context}: failed to apply update —`, err);
    }
}

/**
 * Syncs a Yjs document to Firestore in real-time.
 * Mirrors AFFiNE's server-side Yjs binary snapshot approach, but uses
 * Firestore subcollections instead of PostgreSQL.
 *
 * Collection layout:
 *   /docs/{docId}/updates/{updateId}   — incremental Yjs ops
 *   /docs/{docId}/snapshots/{snapId}   — compacted full-state snapshots
 */
export class FirebaseYjsProvider {
    private yDoc: Y.Doc;
    private docId: string;
    private unsubscribeUpdates?: () => void;
    private updateHandler?: (update: Uint8Array, origin: unknown) => void;
    private connected = false;

    constructor(yDoc: Y.Doc, docId: string) {
        this.yDoc = yDoc;
        this.docId = docId;
    }

    async connect(): Promise<void> {
        if (this.connected) return;
        this.connected = true;

        // ── 1. Load existing snapshot first (faster initial load) ──────────
        await this.loadSnapshot();

        // ── 2. Apply any incremental updates on top of snapshot ───────────
        await this.loadUpdates();

        // ── 3. Listen for new remote updates in real time ─────────────────
        const updatesRef = query(
            collection(db, 'docs', this.docId, 'updates'),
            orderBy('ts', 'asc')
        );

        this.unsubscribeUpdates = onSnapshot(updatesRef, snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    safeApplyUpdate(this.yDoc, data.data, 'firebase-remote', `realtime/${change.doc.id}`);
                }
            });
        });

        // ── 4. Push local changes → Firestore ────────────────────────────
        this.updateHandler = async (update: Uint8Array, origin: unknown) => {
            if (origin === 'firebase-remote') return; // skip echoed updates
            try {
                await addDoc(
                    collection(db, 'docs', this.docId, 'updates'),
                    { data: Array.from(update), ts: Date.now() }
                );
            } catch {
                // Swallow write errors gracefully — local state is still intact
            }
        };

        this.yDoc.on('update', this.updateHandler);
    }

    disconnect(): void {
        if (!this.connected) return;
        this.connected = false;

        if (this.updateHandler) {
            this.yDoc.off('update', this.updateHandler);
            this.updateHandler = undefined;
        }
        this.unsubscribeUpdates?.();
        this.unsubscribeUpdates = undefined;
    }

    /**
     * Called on DocEditorPage unmount — merges all incremental updates into
     * a single compacted snapshot to keep Firestore reads lean.
     */
    async compact(): Promise<void> {
        const updatesRef = collection(db, 'docs', this.docId, 'updates');
        const snapshot = await getDocs(updatesRef);

        if (snapshot.size < UPDATE_COMPACTION_THRESHOLD) return;

        try {
            const fullState = Y.encodeStateAsUpdate(this.yDoc);
            const snapId = `snap-${Date.now()}`;

            // Write compacted snapshot
            await setDoc(
                doc(db, 'docs', this.docId, 'snapshots', snapId),
                {
                    data: Array.from(fullState),
                    ts: Date.now(),
                    updateCount: snapshot.size,
                }
            );

            // Delete all old incremental updates in a batch
            const batch = writeBatch(db);
            snapshot.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
        } catch {
            // Compaction is best-effort — original updates remain if it fails
        }
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private async loadSnapshot(): Promise<void> {
        try {
            const snapshotsRef = query(
                collection(db, 'docs', this.docId, 'snapshots'),
                orderBy('ts', 'desc')
            );
            const snap = await getDocs(snapshotsRef);
            if (!snap.empty) {
                const latest = snap.docs[0].data();
                safeApplyUpdate(this.yDoc, latest.data, 'firebase-remote', 'snapshot');
            }
        } catch {
            // No snapshot yet — that's fine for new docs
        }
    }

    private async loadUpdates(): Promise<void> {
        try {
            const updatesRef = query(
                collection(db, 'docs', this.docId, 'updates'),
                orderBy('ts', 'asc')
            );
            const snap = await getDocs(updatesRef);
            snap.docs.forEach(d => {
                safeApplyUpdate(this.yDoc, d.data().data, 'firebase-remote', `update/${d.id}`);
            });
        } catch {
            // Empty subcollection is normal for brand-new docs
        }
    }
}
