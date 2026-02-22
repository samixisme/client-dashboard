import React, { useState } from 'react';
import { DocMode } from '../../types';

interface Template {
    id: string;
    name: string;
    description: string;
    emoji: string;
    mode: DocMode;
}

const TEMPLATES: Template[] = [
    {
        id: 'blank-page',
        name: 'Blank Page',
        description: 'Start with a clean slate.',
        emoji: '📄',
        mode: 'page',
    },
    {
        id: 'meeting-notes',
        name: 'Meeting Notes',
        description: 'Agenda, attendees, and action items.',
        emoji: '📝',
        mode: 'page',
    },
    {
        id: 'project-brief',
        name: 'Project Brief',
        description: 'Goals, scope, timeline, and deliverables.',
        emoji: '📋',
        mode: 'page',
    },
    {
        id: 'blank-whiteboard',
        name: 'Blank Whiteboard',
        description: 'Infinite canvas for diagrams and sketches.',
        emoji: '🖼️',
        mode: 'edgeless',
    },
    {
        id: 'sprint-plan',
        name: 'Sprint Plan',
        description: 'Visual planning board for your sprint.',
        emoji: '🗺️',
        mode: 'edgeless',
    },
];

interface DocTemplatePickerProps {
    onSelect: (mode: DocMode, title: string, emoji: string) => void;
    onCancel: () => void;
}

const DocTemplatePicker: React.FC<DocTemplatePickerProps> = ({ onSelect, onCancel }) => {
    const [hovered, setHovered] = useState<string | null>(null);
    const GREEN = '#a3e635';

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(6px)' }}
            onClick={onCancel}
        >
            {/* Panel */}
            <div
                className="relative flex flex-col overflow-hidden"
                style={{
                    width: '100%',
                    maxWidth: 520,
                    background: 'rgba(5, 7, 9, 0.94)',
                    backdropFilter: 'blur(40px) saturate(1.8)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 24,
                    boxShadow: '0 32px 80px rgba(0,0,0,0.90)',
                    animation: 'picker-open 0.20s cubic-bezier(0.16,1,0.3,1) both',
                }}
                onClick={e => e.stopPropagation()}
            >
                <style>{`
                    @keyframes picker-open {
                        from { opacity:0; transform: scale(0.94) translateY(12px); }
                        to   { opacity:1; transform: scale(1) translateY(0); }
                    }
                `}</style>

                {/* Header */}
                <div
                    className="flex items-center justify-between px-6 py-5 flex-shrink-0"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.30)' }}>
                            New Document
                        </p>
                        <h2 className="text-lg font-bold text-text-primary">Choose a template</h2>
                    </div>
                    <button
                        onClick={onCancel}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-glass-light transition-all duration-150 text-xl leading-none"
                    >
                        ×
                    </button>
                </div>

                {/* Template grid */}
                <div className="p-4 grid grid-cols-1 gap-2">
                    {TEMPLATES.map(tpl => {
                        const isHov = hovered === tpl.id;
                        return (
                            <button
                                key={tpl.id}
                                onMouseEnter={() => setHovered(tpl.id)}
                                onMouseLeave={() => setHovered(null)}
                                onClick={() => onSelect(tpl.mode, tpl.name === 'Blank Page' || tpl.name === 'Blank Whiteboard' ? 'Untitled' : tpl.name, tpl.emoji)}
                                className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all duration-150"
                                style={{
                                    background: isHov ? `${GREEN}0a` : 'rgba(255,255,255,0.02)',
                                    border: isHov ? `1px solid ${GREEN}22` : '1px solid rgba(255,255,255,0.05)',
                                }}
                            >
                                <span className="text-2xl flex-shrink-0 leading-none">{tpl.emoji}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold" style={{ color: isHov ? GREEN : 'rgba(244,244,245,0.88)' }}>
                                        {tpl.name}
                                    </p>
                                    <p className="text-xs mt-0.5" style={{ color: 'rgba(244,244,245,0.38)' }}>
                                        {tpl.description}
                                    </p>
                                </div>
                                <span
                                    className="text-[10px] font-semibold px-2 py-1 rounded-lg flex-shrink-0"
                                    style={{
                                        background: tpl.mode === 'edgeless' ? 'rgba(139,92,246,0.12)' : 'rgba(163,230,53,0.08)',
                                        color: tpl.mode === 'edgeless' ? '#a78bfa' : GREEN,
                                        border: `1px solid ${tpl.mode === 'edgeless' ? 'rgba(139,92,246,0.20)' : 'rgba(163,230,53,0.15)'}`,
                                    }}
                                >
                                    {tpl.mode === 'edgeless' ? 'Canvas' : 'Page'}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default DocTemplatePicker;
