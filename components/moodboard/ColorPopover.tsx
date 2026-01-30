import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

interface ColorPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    anchorEl: HTMLElement | null;
    onAddColor: (hex: string) => void;
    onAddMultipleColors: (colors: { name: string, hex: string }[]) => void;
}

const ColorPopover: React.FC<ColorPopoverProps> = ({ isOpen, onClose, anchorEl, onAddColor, onAddMultipleColors }) => {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({});
    const [color, setColor] = useState('#A3E635');
    const [view, setView] = useState<'main' | 'ai'>('main');
    const [aiText, setAiText] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState('');

    useLayoutEffect(() => {
        if (isOpen && anchorEl && popoverRef.current) {
            const rect = anchorEl.getBoundingClientRect();
            const popoverRect = popoverRef.current.getBoundingClientRect();
            
            let top = rect.bottom + 8;
            let left = rect.left + rect.width / 2 - popoverRect.width / 2;

            if (left + popoverRect.width > window.innerWidth - 16) {
                left = window.innerWidth - popoverRect.width - 16;
            }
            if (left < 16) {
                left = 16;
            }
            if (top + popoverRect.height > window.innerHeight - 16) {
                top = rect.top - popoverRect.height - 8;
            }

            setStyle({
                position: 'fixed',
                top: `${top}px`,
                left: `${left}px`,
            });
        }
    }, [isOpen, anchorEl]);
    
    useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const content = event.target?.result as string;
                    const parsed = JSON.parse(content);
                    if (Array.isArray(parsed) && parsed.every(item => item.hex)) {
                        onAddMultipleColors(parsed);
                        onClose();
                    } else {
                        alert('Invalid JSON format. Expected an array of objects with a "hex" key.');
                    }
                } catch (err) {
                    alert('Failed to parse JSON file.');
                }
            };
            reader.readAsText(file);
        }
    };
    
    const handleParseWithAI = async () => {
        if (!aiText.trim()) return;
        setIsParsing(true);
        setError('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Extract all colors from the following text. Include any names associated with them. Provide the output as a JSON array of objects, where each object has a "name" and a "hex" property. Text: "${aiText}"`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                hex: { type: Type.STRING },
                            },
                        },
                    },
                },
            });

            const jsonString = response.text.trim();
            const colors = JSON.parse(jsonString);
            onAddMultipleColors(colors);
            onClose();

        } catch (err: unknown) {
            console.error(err);
            setError(`AI parsing failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsParsing(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-40" onClick={onClose}>
            <div 
                ref={popoverRef}
                style={style} 
                className="z-50 bg-glass w-80 rounded-2xl shadow-xl border border-border-color p-4"
                onClick={e => e.stopPropagation()}
            >
                {view === 'main' ? (
                    <>
                        <h3 className="font-semibold text-text-primary text-center mb-4">Add Colors</h3>
                        <div className="flex items-center gap-4 mb-4">
                            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-12 h-12 p-0 border-none rounded-md bg-transparent" />
                            <button onClick={() => { onAddColor(color); onClose(); }} className="w-full h-12 bg-primary text-background font-bold rounded-lg text-sm hover:bg-primary-hover">Add Single Color</button>
                        </div>
                        <div className="space-y-2 text-sm">
                            <label className="w-full text-center block cursor-pointer px-3 py-2 bg-glass-light rounded-md hover:bg-border-color">
                                Import from JSON
                                <input type="file" accept=".json" className="hidden" onChange={handleFileChange} />
                            </label>
                            <button onClick={() => setView('ai')} className="w-full text-center block cursor-pointer px-3 py-2 bg-glass-light rounded-md hover:bg-border-color">
                                Import from Text (with AI)
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <h3 className="font-semibold text-text-primary text-center mb-4">Import with AI</h3>
                        <p className="text-xs text-text-secondary mb-2">Paste content from a PDF, document, or website, and AI will try to extract the colors.</p>
                        <textarea value={aiText} onChange={e => setAiText(e.target.value)} rows={6} className="w-full bg-glass-light border border-border-color rounded-md p-2 text-sm" placeholder="Paste content here..." />
                        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
                        <div className="flex items-center justify-end gap-2 mt-4">
                            <button onClick={() => setView('main')} className="text-sm text-text-secondary hover:underline">Back</button>
                            <button onClick={handleParseWithAI} disabled={isParsing} className="px-4 py-2 bg-primary text-background font-bold rounded-lg text-sm hover:bg-primary-hover disabled:bg-gray-500">
                                {isParsing ? 'Parsing...' : 'Parse Colors'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ColorPopover;