import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { DocMode, Doc } from '../../types';
import { useDocs } from '../../contexts/DocsContext';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';

interface DocToolbarProps {
    doc: Doc;
    onModeToggle: (mode: DocMode) => void;
}

const DocToolbar: React.FC<DocToolbarProps> = ({ doc, onModeToggle }) => {
    const navigate = useNavigate();
    const { updateDoc } = useDocs();
    const [title, setTitle] = useState(doc.title);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiRef = useRef<HTMLDivElement>(null);
    const GREEN = '#a3e635';

    // Sync title when doc changes (e.g. navigating between docs)
    useEffect(() => {
        setTitle(doc.title);
    }, [doc.id, doc.title]);

    // Close emoji picker on outside click
    useEffect(() => {
        if (!showEmojiPicker) return;
        const handler = (e: MouseEvent) => {
            if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showEmojiPicker]);

    const handleTitleBlur = () => {
        const trimmed = title.trim() || 'Untitled';
        if (trimmed !== doc.title) {
            updateDoc(doc.id, { title: trimmed });
        }
    };

    const handleEmojiSelect = (emoji: { native: string }) => {
        setShowEmojiPicker(false);
        updateDoc(doc.id, { emoji: emoji.native });
    };

    return (
        <div
            className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}
        >
            {/* Back button */}
            <button
                onClick={() => navigate(-1)}
                title="Go back"
                className="h-9 w-9 flex items-center justify-center rounded-xl bg-glass text-text-secondary hover:bg-glass-light hover:text-text-primary border border-border-color flex-shrink-0 transition-all duration-200"
            >
                <ArrowLeftIcon className="h-4 w-4" />
            </button>

            {/* Emoji + Title */}
            <div className="flex items-center gap-2 flex-1 min-w-0" ref={emojiRef}>
                <div className="relative">
                    <button
                        onClick={() => setShowEmojiPicker(p => !p)}
                        className="text-xl leading-none hover:scale-110 transition-transform duration-150 flex-shrink-0"
                        title="Change emoji"
                    >
                        {doc.emoji ?? (doc.mode === 'edgeless' ? '🖼️' : '📄')}
                    </button>

                    {showEmojiPicker && (
                        <div className="absolute top-10 left-0 z-50">
                            <Picker
                                data={data}
                                onEmojiSelect={handleEmojiSelect}
                                theme="dark"
                                previewPosition="none"
                                skinTonePosition="none"
                            />
                        </div>
                    )}
                </div>

                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    className="flex-1 min-w-0 bg-transparent text-text-primary font-semibold text-base outline-none truncate placeholder:text-text-secondary/30"
                    placeholder="Untitled"
                />
            </div>

            {/* Mode toggle pill */}
            <div
                className="flex items-center rounded-xl overflow-hidden border flex-shrink-0"
                style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}
            >
                {(['page', 'edgeless'] as DocMode[]).map(m => {
                    const isActive = doc.mode === m;
                    return (
                        <button
                            key={m}
                            onClick={() => onModeToggle(m)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all duration-200"
                            style={{
                                background: isActive ? `${GREEN}18` : 'transparent',
                                color: isActive ? GREEN : 'rgba(244,244,245,0.45)',
                                borderRight: m === 'page' ? '1px solid rgba(255,255,255,0.06)' : 'none',
                            }}
                        >
                            <span>{m === 'page' ? '📄' : '🖼️'}</span>
                            <span>{m === 'page' ? 'Page' : 'Canvas'}</span>
                        </button>
                    );
                })}
            </div>

            {/* Linked board badge */}
            {doc.linkedBoardId && (
                <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg flex-shrink-0"
                    style={{ background: 'rgba(163,230,53,0.10)', color: GREEN, border: '1px solid rgba(163,230,53,0.20)' }}
                >
                    🗂 Linked Board
                </span>
            )}
        </div>
    );
};

export default DocToolbar;
