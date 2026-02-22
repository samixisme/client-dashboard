import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDocs } from '../contexts/DocsContext';
import { useData } from '../contexts/DataContext';
import { useActiveProject } from '../contexts/ActiveProjectContext';
import { DocMode, Doc } from '../types';
import DocTemplatePicker from '../components/docs/DocTemplatePicker';
import { DocIcon } from '../components/icons/DocIcon';
import { WhiteboardIcon } from '../components/icons/WhiteboardIcon';

const GREEN = '#a3e635';

// ── Doc Card ──────────────────────────────────────────────────────────────────
const DocCard: React.FC<{ doc: Doc; onClick: () => void; onDelete: () => void }> = ({ doc, onClick, onDelete }) => {
    const [hov, setHov] = useState(false);

    const relativeTime = (iso: string) => {
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            className="group relative flex flex-col gap-3 p-5 rounded-2xl border cursor-pointer transition-all duration-300"
            style={{
                background: hov ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.025)',
                border: hov ? `1px solid ${GREEN}28` : '1px solid rgba(255,255,255,0.07)',
                boxShadow: hov ? `0 8px 40px rgba(0,0,0,0.40)` : 'none',
            }}
            onClick={onClick}
        >
            {/* Accent bar */}
            <div
                className="absolute top-0 left-0 right-0 h-px transition-opacity duration-300"
                style={{ background: `linear-gradient(90deg, ${GREEN}aa 0%, transparent 100%)`, opacity: hov ? 1 : 0 }}
            />

            {/* Emoji + mode badge */}
            <div className="flex items-start justify-between gap-2">
                <span className="text-2xl leading-none">{doc.emoji ?? (doc.mode === 'edgeless' ? '🖼️' : '📄')}</span>
                <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-lg flex-shrink-0"
                    style={{
                        background: doc.mode === 'edgeless' ? 'rgba(139,92,246,0.12)' : 'rgba(163,230,53,0.08)',
                        color: doc.mode === 'edgeless' ? '#a78bfa' : GREEN,
                        border: `1px solid ${doc.mode === 'edgeless' ? 'rgba(139,92,246,0.22)' : 'rgba(163,230,53,0.18)'}`,
                    }}
                >
                    {doc.mode === 'edgeless' ? 'Canvas' : 'Page'}
                </span>
            </div>

            {/* Title */}
            <h3 className="text-sm font-semibold text-text-primary truncate">
                {doc.title || 'Untitled'}
            </h3>

            {/* Footer */}
            <div className="flex items-center justify-between mt-auto">
                <span className="text-xs" style={{ color: 'rgba(244,244,245,0.30)' }}>
                    {relativeTime(doc.updatedAt)}
                </span>

                {/* Delete — only visible on hover */}
                <button
                    onClick={e => { e.stopPropagation(); onDelete(); }}
                    className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded-lg transition-all duration-150"
                    style={{ color: 'rgba(239,68,68,0.70)', background: 'rgba(239,68,68,0.08)' }}
                >
                    Delete
                </button>
            </div>
        </div>
    );
};

// ── Empty State ───────────────────────────────────────────────────────────────
const EmptyState: React.FC<{ label: string; onNew: () => void }> = ({ label, onNew }) => (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: `${GREEN}10`, border: `1px solid ${GREEN}20` }}
        >
            <span className="text-3xl">📄</span>
        </div>
        <p className="text-text-secondary text-sm">No {label} yet</p>
        <button
            onClick={onNew}
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200"
            style={{ background: GREEN, color: '#050709' }}
        >
            + New {label === 'whiteboards' ? 'Whiteboard' : 'Document'}
        </button>
    </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────
const DocsListPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { docs, docsLoading, createDoc, deleteDoc } = useDocs();
    const { data } = useData();
    const { setActiveProjectId } = useActiveProject();

    const [activeTab, setActiveTab] = useState<'pages' | 'whiteboards'>('pages');
    const [showPicker, setShowPicker] = useState(false);

    const project = data.projects.find(p => p.id === projectId);
    const brand = project ? data.brands.find(b => b.id === project.brandId) : undefined;

    const projectDocs = useMemo(() => docs.filter(d => d.projectId === projectId), [docs, projectId]);
    const pageDocs = useMemo(() => projectDocs.filter(d => d.mode === 'page'), [projectDocs]);
    const edgelessDocs = useMemo(() => projectDocs.filter(d => d.mode === 'edgeless'), [projectDocs]);

    const displayed = activeTab === 'pages' ? pageDocs : edgelessDocs;

    const handleTemplateSelect = async (mode: DocMode, title: string, emoji: string) => {
        setShowPicker(false);
        if (!projectId || !project) return;
        const brandId = project.brandId;
        const id = await createDoc(projectId, brandId, mode, title, emoji);
        if (id) navigate(`/docs/${projectId}/${id}`);
    };

    const handleDelete = async (docId: string) => {
        if (window.confirm('Delete this document? This cannot be undone.')) {
            await deleteDoc(docId);
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-8 animate-fade-in">
                <div>
                    {brand && (
                        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.28)' }}>
                            {brand.name}
                        </p>
                    )}
                    <h1 className="text-3xl font-bold text-text-primary">
                        {project?.name ?? 'Docs'}
                    </h1>
                    <p className="text-text-secondary text-sm mt-1">
                        {projectDocs.length} document{projectDocs.length !== 1 ? 's' : ''}
                    </p>
                </div>

                <button
                    onClick={() => setShowPicker(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 hover:scale-105"
                    style={{ background: GREEN, color: '#050709' }}
                >
                    <span>+</span>
                    <span>New Document</span>
                </button>
            </div>

            {/* Tabs */}
            <div
                className="flex gap-1 p-1 rounded-xl mb-6 w-fit"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
                {(['pages', 'whiteboards'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                        style={{
                            background: activeTab === tab ? `${GREEN}15` : 'transparent',
                            color: activeTab === tab ? GREEN : 'rgba(244,244,245,0.45)',
                            border: activeTab === tab ? `1px solid ${GREEN}25` : '1px solid transparent',
                        }}
                    >
                        {tab === 'pages' ? <DocIcon className="h-4 w-4" /> : <WhiteboardIcon className="h-4 w-4" />}
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(244,244,245,0.50)' }}
                        >
                            {tab === 'pages' ? pageDocs.length : edgelessDocs.length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Grid */}
            {docsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-36 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
                    ))}
                </div>
            ) : displayed.length === 0 ? (
                <EmptyState label={activeTab} onNew={() => setShowPicker(true)} />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {displayed.map((d, i) => (
                        <div key={d.id} style={{ animationDelay: `${i * 50}ms` }} className="animate-fade-in-up">
                            <DocCard
                                doc={d}
                                onClick={() => navigate(`/docs/${projectId}/${d.id}`)}
                                onDelete={() => handleDelete(d.id)}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Template picker modal */}
            {showPicker && (
                <DocTemplatePicker
                    onSelect={handleTemplateSelect}
                    onCancel={() => setShowPicker(false)}
                />
            )}
        </div>
    );
};

export default DocsListPage;
