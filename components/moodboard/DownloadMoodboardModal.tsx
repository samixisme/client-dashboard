import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { MoodboardItem } from '../../types';
import MoodboardItemComponent from './MoodboardItemComponent';
import ConnectorLine from './ConnectorLine';
import { toast } from 'sonner';

declare const htmlToImage: {
    toPng: (node: HTMLElement, options?: Record<string, unknown>) => Promise<string>;
    toJpeg: (node: HTMLElement, options?: Record<string, unknown>) => Promise<string>;
};

interface DownloadMoodboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: MoodboardItem[];
    canvasRef: React.RefObject<HTMLDivElement>;
}

const DownloadMoodboardModal: React.FC<DownloadMoodboardModalProps> = ({ isOpen, onClose, items, canvasRef }) => {
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [format, setFormat] = useState<'png' | 'jpeg'>('png');
    
    const [cropRect, setCropRect] = useState({ x: 50, y: 50, width: 300, height: 200 });
    const [dragState, setDragState] = useState<{ mode: 'move' | 'resize', startX: number, startY: number, originalRect: typeof cropRect } | null>(null);

    const { contentBbox, scale } = useMemo(() => {
        if (!items.length || !isOpen) return { contentBbox: { minX: 0, minY: 0, width: 100, height: 100 }, scale: 1 };
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        items.forEach(item => {
            minX = Math.min(minX, item.position.x);
            minY = Math.min(minY, item.position.y);
            maxX = Math.max(maxX, item.position.x + item.size.width);
            maxY = Math.max(maxY, item.position.y + item.size.height);
        });

        const bbox = { minX, minY, width: maxX - minX, height: maxY - minY };
        
        // Calculate scale to fit preview in modal
        const previewWidth = 600; // max width for preview
        const previewHeight = 400; // max height
        const calculatedScale = Math.min(previewWidth / bbox.width, previewHeight / bbox.height, 1);
        
        return { contentBbox: bbox, scale: calculatedScale };
    }, [items, isOpen]);
    
    const handleDownload = async () => {
        if (!canvasRef.current) return;
        setIsLoading(true);

        const originalCropRect = {
            x: cropRect.x / scale + contentBbox.minX,
            y: cropRect.y / scale + contentBbox.minY,
            width: cropRect.width / scale,
            height: cropRect.height / scale,
        };
        
        try {
             const filter = (node: HTMLElement) => {
                // Exclude remote stylesheets to prevent CORS errors
                if (node.tagName === 'LINK' && node.hasAttribute('href') && (node.getAttribute('href') || '').includes('fonts.googleapis.com')) {
                    return false;
                }
                return true;
            };
            
            const options = {
                quality: 0.95,
                pixelRatio: 2,
                width: originalCropRect.width,
                height: originalCropRect.height,
                style: {
                    width: '5000px', // Original canvas dimensions
                    height: '5000px',
                    transform: `translateX(-${originalCropRect.x}px) translateY(-${originalCropRect.y}px)`,
                },
                filter: filter,
            };

            const dataUrl = format === 'png' 
                ? await htmlToImage.toPng(canvasRef.current, options)
                : await htmlToImage.toJpeg(canvasRef.current, options);

            const link = document.createElement('a');
            link.download = `moodboard-export.${format}`;
            link.href = dataUrl;
            link.click();
            toast.success('Moodboard downloaded');
            onClose();

        } catch (error) {
            console.error('oops, something went wrong!', error);
            toast.error('Failed to download image. This may be due to cross-origin images.');
        } finally {
            setIsLoading(false);
        }
    };
    
    // Crop box interaction handlers
    const handlePointerDown = (e: React.MouseEvent, mode: 'move' | 'resize') => {
        e.preventDefault();
        e.stopPropagation();
        setDragState({ mode, startX: e.clientX, startY: e.clientY, originalRect: cropRect });
    };

    const handlePointerMove = (e: MouseEvent) => {
        if (!dragState) return;
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        
        if (dragState.mode === 'move') {
            setCropRect(prev => ({ ...prev, x: dragState.originalRect.x + dx, y: dragState.originalRect.y + dy }));
        } else {
            setCropRect(prev => ({ ...prev, width: Math.max(20, dragState.originalRect.width + dx), height: Math.max(20, dragState.originalRect.height + dy) }));
        }
    };

    const handlePointerUp = () => {
        setDragState(null);
    };

    useEffect(() => {
        if (dragState) {
            document.addEventListener('mousemove', handlePointerMove);
            document.addEventListener('mouseup', handlePointerUp);
            return () => {
                document.removeEventListener('mousemove', handlePointerMove);
                document.removeEventListener('mouseup', handlePointerUp);
            };
        }
    }, [dragState]);


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-surface w-full max-w-4xl rounded-2xl shadow-xl border border-border-color p-8 flex flex-col" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-text-primary mb-6">Download Moodboard</h2>
                
                <div className="flex-1 flex items-center justify-center bg-background rounded-lg p-4 border border-border-color overflow-auto">
                    <div ref={previewContainerRef} className="relative" style={{ width: contentBbox.width * scale, height: contentBbox.height * scale }}>
                        {/* Render a simplified preview */}
                        {items.map(item => (
                            <div key={item.id} className="absolute border border-border-color/50" style={{ 
                                left: (item.position.x - contentBbox.minX) * scale,
                                top: (item.position.y - contentBbox.minY) * scale,
                                width: item.size.width * scale,
                                height: item.size.height * scale,
                                backgroundColor: item.type === 'color' ? item.content.hex : 'rgba(255,255,255,0.05)',
                                overflow: 'hidden'
                            }}>
                                {item.type === 'image' && <img src={item.content.imageUrl} className="w-full h-full object-cover" />}
                                {(item.type === 'text' || item.type === 'column') && <div className="p-1 text-[8px] text-text-secondary truncate">{item.content.text || item.content.title}</div>}
                            </div>
                        ))}
                         {/* Crop selection box */}
                         <div
                            className="absolute border-2 border-primary bg-primary/20 cursor-move"
                            style={{ left: cropRect.x, top: cropRect.y, width: cropRect.width, height: cropRect.height }}
                            onMouseDown={(e) => handlePointerDown(e, 'move')}
                         >
                             <div 
                                className="absolute bottom-0 right-0 w-4 h-4 -m-2 cursor-se-resize"
                                onMouseDown={(e) => handlePointerDown(e, 'resize')}
                             >
                                <div className="w-full h-full bg-primary rounded-full border-2 border-surface"/>
                             </div>
                         </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-6">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium">Format:</label>
                        <div className="flex bg-glass-light p-1 rounded-lg">
                             <button onClick={() => setFormat('png')} className={`px-4 py-1 text-sm rounded-md ${format === 'png' ? 'bg-surface text-text-primary' : 'text-text-secondary'}`}>PNG</button>
                             <button onClick={() => setFormat('jpeg')} className={`px-4 py-1 text-sm rounded-md ${format === 'jpeg' ? 'bg-surface text-text-primary' : 'text-text-secondary'}`}>JPG</button>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="px-6 py-2 bg-glass-light text-text-primary text-sm font-medium rounded-lg hover:bg-border-color">Cancel</button>
                        <button onClick={handleDownload} disabled={isLoading} className="px-6 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover disabled:bg-gray-500">
                            {isLoading ? 'Downloading...' : 'Download'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DownloadMoodboardModal;
