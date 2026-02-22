import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useDocs } from '../contexts/DocsContext';
import { DocMode } from '../types';
import { getDocCollection, acquireProvider, releaseProvider } from '../utils/blocksuite';
import BlockSuiteEditor from '../components/docs/BlockSuiteEditor';
import DocToolbar from '../components/docs/DocToolbar';
import DocSidebar from '../components/docs/DocSidebar';
import type { Doc as BlockSuiteDoc } from '@blocksuite/store';

interface DocEditorPageProps {
    defaultMode?: DocMode;
}

const DocEditorPage: React.FC<DocEditorPageProps> = ({ defaultMode }) => {
    const { projectId = '', docId = '' } = useParams<{ projectId: string; docId: string }>();
    const [searchParams] = useSearchParams();
    const { docs, updateDoc } = useDocs();

    // Stable ref — always current docMeta without being a useEffect dependency
    const docMetaRef = useRef(docs.find(d => d.id === docId));
    docMetaRef.current = docs.find(d => d.id === docId);
    const docMeta = docMetaRef.current;

    const effectiveMode: DocMode = defaultMode
        ?? (searchParams.get('mode') === 'edgeless' ? 'edgeless' : undefined)
        ?? docMeta?.mode
        ?? 'page';

    const [bsDoc, setBsDoc] = useState<BlockSuiteDoc | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [editorReady, setEditorReady] = useState(false);

    const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!docId) return;

        let isMounted = true;

        const boot = async () => {
            const collection = getDocCollection();

            const bs: BlockSuiteDoc = collection.docs.has(docId)
                ? collection.docs.get(docId) as unknown as BlockSuiteDoc
                : collection.createDoc({ id: docId });

            // doc.load() MUST be called before acquireProvider.
            // The provider calls Y.applyUpdate() which populates the Yjs map.
            // BlockSuiteDoc only wires its reactive _blocks map to the Yjs doc
            // after load() — without this, applyUpdate() fills the Yjs state but
            // doc.root stays null because the signal subscriptions aren't set up yet.
            if (!bs.loaded) {
                bs.load();
            }

            // acquireProvider connects to Firestore, loads the snapshot, and
            // applies all incremental updates onto the now-ready block tree.
            await acquireProvider(bs.spaceDoc, docId);

            if (!isMounted) {
                releaseProvider(docId);
                return;
            }

            setBsDoc(bs);
            setEditorReady(true);
        };

        boot();

        saveTimerRef.current = setInterval(() => {
            if (docMetaRef.current) updateDoc(docId, {});
        }, 30_000);

        return () => {
            isMounted = false;
            if (saveTimerRef.current) clearInterval(saveTimerRef.current);
            // releaseProvider triggers compact() + disconnect() and tracks the
            // teardown promise so the next acquireProvider call waits for it.
            releaseProvider(docId);
            // Do NOT reset bsDoc/editorReady — avoids blank flash on re-renders
        };
    }, [docId]);

    const handleModeToggle = useCallback(async (mode: DocMode) => {
        if (!docId || !docMeta || mode === docMeta.mode) return;
        await updateDoc(docId, { mode });
    }, [docId, docMeta, updateDoc]);

    return (
        <div className="flex flex-col h-full relative" style={{ minHeight: 0 }}>
            {docMeta && <DocToolbar doc={docMeta} onModeToggle={handleModeToggle} />}

            <button
                onClick={() => setSidebarOpen(p => !p)}
                title="Document list"
                className="absolute top-14 left-3 z-20 w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-glass-light border border-border-color transition-all duration-150"
                style={{ background: 'rgba(5,7,9,0.70)', backdropFilter: 'blur(8px)' }}
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" />
                </svg>
            </button>

            <div className="flex flex-1 overflow-hidden relative" style={{ minHeight: 0, height: '100%' }}>
                {sidebarOpen && (
                    <DocSidebar
                        currentDocId={docId}
                        projectId={projectId}
                        open={sidebarOpen}
                        onClose={() => setSidebarOpen(false)}
                    />
                )}

                {editorReady && bsDoc ? (
                    <BlockSuiteEditor bsDoc={bsDoc} mode={effectiveMode} />
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                            <p className="text-text-secondary text-sm">
                                {effectiveMode === 'edgeless' ? 'Loading canvas…' : 'Loading editor…'}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocEditorPage;
