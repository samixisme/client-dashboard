import React, { useEffect, useRef } from 'react';
import { PageEditor, EdgelessEditor } from '@blocksuite/presets';
import { PageEditorBlockSpecs, EdgelessEditorBlockSpecs } from '@blocksuite/blocks';
// ① Required: defines ALL --affine-* CSS variables (font families, colours,
//    --affine-editor-width, shadows, etc.). Without this import the editor
//    renders with zero font size and completely invisible content.
import '@toeverything/theme/style.css';
// ② Dark-glass overrides on top of the base theme.
import './affine-theme-override.css';
import type { Doc as BlockSuiteDoc } from '@blocksuite/store';
import { DocMode } from '../../types';

interface BlockSuiteEditorProps {
    bsDoc: BlockSuiteDoc;
    mode: DocMode;
}

const BlockSuiteEditor: React.FC<BlockSuiteEditorProps> = ({ bsDoc, mode }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<PageEditor | EdgelessEditor | null>(null);

    // Activate BlockSuite's ThemeObserver MutationObserver.
    // ThemeService reads document.documentElement.dataset.theme — must be set
    // before the editor mounts so the first render resolves the correct colours.
    useEffect(() => {
        document.documentElement.dataset.theme = 'dark';
    }, []);

    useEffect(() => {
        if (!containerRef.current || !bsDoc) return;

        let cancelled = false;

        (async () => {
            if (cancelled || !containerRef.current) return;

            // Ensure doc is loaded and has a root block.
            // doc.load() is idempotent — safe to call even if already loaded.
            // Block structure differs by mode:
            //   page     → affine:page > affine:surface + affine:note > affine:paragraph
            //   edgeless → affine:page > affine:surface  (no note/paragraph)
            if (!bsDoc.root) {
                bsDoc.load();
                const rootId = bsDoc.addBlock('affine:page' as never, {});
                bsDoc.addBlock('affine:surface' as never, {}, rootId);
                if (mode === 'page') {
                    const noteId = bsDoc.addBlock('affine:note' as never, {}, rootId);
                    bsDoc.addBlock('affine:paragraph' as never, {}, noteId);
                }
            }

            if (!bsDoc.root) {
                console.error('[BlockSuiteEditor] doc.root is still null after init — schema registered?');
                return;
            }

            // Choose the correct Lit element and block specs for the current mode.
            const editor = mode === 'edgeless' ? new EdgelessEditor() : new PageEditor();
            editor.doc = bsDoc;
            editor.specs = mode === 'edgeless' ? EdgelessEditorBlockSpecs : PageEditorBlockSpecs;
            editor.style.cssText = 'display:block;width:100%;height:100%;';

            containerRef.current.innerHTML = '';
            containerRef.current.appendChild(editor);
            editorRef.current = editor;

            try {
                await editor.updateComplete;
            } catch (err) {
                console.error('[BlockSuiteEditor] updateComplete error:', err);
            }
        })();

        return () => {
            cancelled = true;
            const el = editorRef.current;
            editorRef.current = null;
            if (el && containerRef.current) {
                try { containerRef.current.removeChild(el); } catch { /* already removed */ }
            }
        };
    // Re-mount whenever the doc OR mode changes (page ↔ edgeless).
    }, [bsDoc, mode]);

    return (
        <div
            ref={containerRef}
            className="flex-1 w-full"
            style={{ height: '100%', minHeight: 0 }}
        />
    );
};

export default BlockSuiteEditor;
