import { DocCollection, Schema } from '@blocksuite/store';
import { AffineSchemas } from '@blocksuite/blocks/schemas';
import { effects as presetsEffects } from '@blocksuite/presets/effects';
import { effects as blockStdEffects } from '@blocksuite/block-std/effects';
import type { Doc as BSDoc } from '@blocksuite/store';
import { FirebaseYjsProvider } from './FirebaseYjsProvider';

// Register all custom elements at module-load time — must happen before
// any element is constructed. Two calls required:
//   presetsEffects()  → affine-editor-container, page-editor, + 165 block elements
//   blockStdEffects() → editor-host, gfx-viewport (NOT covered by presetsEffects)
let _effectsRegistered = false;
if (!_effectsRegistered) {
    presetsEffects();
    blockStdEffects();
    _effectsRegistered = true;
}

export function afterEffectsReady(): Promise<void> {
    return new Promise(resolve => queueMicrotask(resolve));
}

// ── Singleton DocCollection ───────────────────────────────────────────────────
let _collection: DocCollection | null = null;

export function getDocCollection(): DocCollection {
    if (!_collection) {
        const schema = new Schema().register(AffineSchemas);
        _collection = new DocCollection({ schema, id: 'client-dashboard' });
        _collection.meta.initialize();
    }
    return _collection;
}

// ── Provider registry — prevents clientId conflicts ───────────────────────────
//
// bs.spaceDoc is a *reused* Y.Doc instance from the singleton DocCollection.
// Creating a new FirebaseYjsProvider against it before the old one disconnects
// causes Yjs to detect two writers on the same doc and reassign the clientId.
//
// The registry ensures:
//   1. Only one provider exists per docId at any time.
//   2. The previous provider is fully disconnected (and compaction awaited)
//      before a new one is created.
//   3. The pending-disconnect promise is tracked so rapid re-mounts
//      (React StrictMode, HMR) still serialise correctly.

interface ProviderEntry {
    provider: FirebaseYjsProvider;
    /** Promise that resolves once compact + disconnect have finished. */
    teardownPromise: Promise<void> | null;
}

const _providerRegistry = new Map<string, ProviderEntry>();

/**
 * Returns a connected FirebaseYjsProvider for `docId`, creating a fresh one
 * only after the previous provider (if any) has fully disconnected.
 *
 * Always call `releaseProvider(docId)` in the useEffect cleanup — never call
 * provider.disconnect() directly, so the registry stays consistent.
 */
export async function acquireProvider(
    yDoc: BSDoc['spaceDoc'],
    docId: string
): Promise<FirebaseYjsProvider> {
    const existing = _providerRegistry.get(docId);

    if (existing) {
        // Wait for the previous teardown to finish before creating a new one.
        // This serialises connect calls even under React StrictMode double-invoke.
        if (existing.teardownPromise) {
            await existing.teardownPromise;
        } else {
            // Still connected (e.g. same docId, same mount) — reuse it.
            return existing.provider;
        }
    }

    const provider = new FirebaseYjsProvider(yDoc, docId);
    _providerRegistry.set(docId, { provider, teardownPromise: null });
    await provider.connect();
    return provider;
}

/**
 * Compacts and disconnects the provider for `docId`.
 * Call this in the useEffect cleanup — it is safe to call multiple times.
 */
export function releaseProvider(docId: string): void {
    const entry = _providerRegistry.get(docId);
    if (!entry || entry.teardownPromise) return; // already releasing

    const teardown = entry.provider
        .compact()
        .catch(() => { /* compaction is best-effort */ })
        .finally(() => {
            entry.provider.disconnect();
            // Remove from registry only after teardown completes so that
            // any concurrent acquireProvider call waits on teardownPromise.
            _providerRegistry.delete(docId);
        });

    entry.teardownPromise = teardown;
}

// ── Block initialisation ──────────────────────────────────────────────────────

/**
 * Official BlockSuite pattern (mirrors @blocksuite/presets/dist/helpers/index.js):
 *
 *   doc.load()                              ← must come first
 *   doc.addBlock('affine:page', {})         ← root
 *   doc.addBlock('affine:surface', {}, rootId)
 *   doc.addBlock('affine:note', {}, rootId)
 *   doc.addBlock('affine:paragraph', {}, noteId)
 *
 * Only called for brand-new docs with no existing Yjs/Firestore content.
 */
export function initDocBlocks(doc: BSDoc): void {
    if (doc.root) return; // already has content — Yjs restored it
    doc.load();
    const rootId = doc.addBlock('affine:page' as never, {});
    doc.addBlock('affine:surface' as never, {}, rootId);
    const noteId = doc.addBlock('affine:note' as never, {}, rootId);
    doc.addBlock('affine:paragraph' as never, {}, noteId);
}

export function resetDocCollection(): void {
    // Disconnect all live providers before disposing the collection.
    for (const [docId] of _providerRegistry) {
        releaseProvider(docId);
    }
    _collection?.dispose();
    _collection = null;
}

export type { BSDoc as BlockSuiteDoc };
