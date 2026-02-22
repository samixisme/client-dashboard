import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Doc } from '../../types';
import { useDocs } from '../../contexts/DocsContext';

interface DocSidebarProps {
    currentDocId: string;
    projectId: string;
    open: boolean;
    onClose: () => void;
}

const DocSidebar: React.FC<DocSidebarProps> = ({ currentDocId, projectId, open, onClose }) => {
    const navigate = useNavigate();
    const { getProjectDocs } = useDocs();
    const docs = getProjectDocs(projectId);
    const GREEN = '#a3e635';

    const pageDocs = docs.filter(d => d.mode === 'page');
    const edgelessDocs = docs.filter(d => d.mode === 'edgeless');

    const DocRow: React.FC<{ doc: Doc }> = ({ doc }) => {
        const isActive = doc.id === currentDocId;
        return (
            <button
                onClick={() => {
                    navigate(`/docs/${projectId}/${doc.id}`);
                    onClose();
                }}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-150"
                style={{
                    background: isActive ? `${GREEN}10` : 'transparent',
                    border: isActive ? `1px solid ${GREEN}25` : '1px solid transparent',
                }}
            >
                <span className="text-base flex-shrink-0 leading-none">
                    {doc.emoji ?? (doc.mode === 'edgeless' ? '🖼️' : '📄')}
                </span>
                <span
                    className="text-sm font-medium truncate"
                    style={{ color: isActive ? GREEN : 'rgba(244,244,245,0.75)' }}
                >
                    {doc.title || 'Untitled'}
                </span>
                {doc.isPinned && (
                    <span className="text-[10px] ml-auto flex-shrink-0" style={{ color: 'rgba(244,244,245,0.30)' }}>
                        📌
                    </span>
                )}
            </button>
        );
    };

    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-30"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className="absolute left-0 top-0 bottom-0 z-40 flex flex-col overflow-hidden"
                style={{
                    width: 260,
                    background: 'rgba(5, 7, 9, 0.92)',
                    backdropFilter: 'blur(32px) saturate(1.8)',
                    borderRight: '1px solid rgba(255,255,255,0.07)',
                    animation: 'doc-sidebar-open 0.18s cubic-bezier(0.16,1,0.3,1) both',
                }}
            >
                <style>{`
                    @keyframes doc-sidebar-open {
                        from { opacity:0; transform: translateX(-12px); }
                        to   { opacity:1; transform: translateX(0); }
                    }
                `}</style>

                {/* Header */}
                <div
                    className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.30)' }}>
                        Documents
                    </p>
                    <button
                        onClick={onClose}
                        className="text-text-secondary hover:text-text-primary transition-colors duration-150 text-lg leading-none"
                    >
                        ×
                    </button>
                </div>

                {/* Doc list */}
                <div className="flex-1 overflow-y-auto p-3 space-y-4">
                    {pageDocs.length > 0 && (
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                Pages
                            </p>
                            <div className="space-y-0.5">
                                {pageDocs.map(d => <DocRow key={d.id} doc={d} />)}
                            </div>
                        </div>
                    )}

                    {edgelessDocs.length > 0 && (
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                Whiteboards
                            </p>
                            <div className="space-y-0.5">
                                {edgelessDocs.map(d => <DocRow key={d.id} doc={d} />)}
                            </div>
                        </div>
                    )}

                    {docs.length === 0 && (
                        <div className="py-8 text-center">
                            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>No documents yet</p>
                        </div>
                    )}
                </div>

                {/* New doc shortcut */}
                <div
                    className="flex-shrink-0 px-3 py-3"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                >
                    <button
                        onClick={() => {
                            navigate(`/docs/${projectId}`);
                            onClose();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
                        style={{ background: `${GREEN}10`, color: GREEN, border: `1px solid ${GREEN}20` }}
                    >
                        <span>+</span>
                        <span>New Document</span>
                    </button>
                </div>
            </div>
        </>
    );
};

export default DocSidebar;
