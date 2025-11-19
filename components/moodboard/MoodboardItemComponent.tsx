import React from 'react';
import { MoodboardItem } from '../../types';
import { DeleteIcon } from '../icons/DeleteIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { EditIcon } from '../icons/EditIcon';

interface MoodboardItemProps {
    item: MoodboardItem;
    items: MoodboardItem[];
    onDragStart: (itemId: string, e: React.MouseEvent | React.TouchEvent) => void;
    onResizeStart: (e: React.MouseEvent | React.TouchEvent) => void;
    onClick: (e: React.MouseEvent) => void;
    onDelete: (itemId: string) => void;
    onDownloadRequest: (item: MoodboardItem) => void;
    onEdit: (item: MoodboardItem) => void;
    isConnecting: boolean;
    interactionMode: 'move' | 'pan';
    draggedOverColumnId: string | null;
}

const MoodboardItemComponent: React.FC<MoodboardItemProps> = ({ item, items, onDragStart, onResizeStart, onClick, onDelete, onDownloadRequest, onEdit, isConnecting, interactionMode, draggedOverColumnId }) => {
    
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        // Prevent default browser actions like text selection, especially on mouse drag
        if (e.type === 'mousedown') {
            e.preventDefault();
        }
        onDragStart(item.id, e);
    };
    
    const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        onResizeStart(e);
    };

    const renderContent = () => {
        switch (item.type) {
            case 'text':
                return <p className="p-4 text-text-primary whitespace-pre-wrap">{item.content.text || 'New Text Block'}</p>;
            case 'image':
                return <img src={item.content.imageUrl || 'https://picsum.photos/400/300'} className="w-full h-full object-cover" alt="moodboard item" draggable="false" onDragStart={(e) => e.preventDefault()}/>;
            case 'link':
                 return (
                    <div className="p-4 h-full flex flex-col justify-between">
                        <div>
                             <p className="font-bold text-text-primary break-all">{item.content.text || item.content.url || 'New Link'}</p>
                             <p className="text-xs text-text-secondary mt-1">A preview of the link could be shown here.</p>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if(item.content.url) window.open(item.content.url, '_blank', 'noopener,noreferrer');
                            }}
                            className="mt-2 self-start px-3 py-1 bg-primary text-white text-xs font-medium rounded hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary"
                        >
                            Open Link
                        </button>
                    </div>
                );
            case 'column':
                return (
                     <div className="p-4 h-full flex flex-col">
                        <h3 className="font-bold text-text-primary mb-2 border-b border-border-color pb-2">{item.content.title || 'Column'}</h3>
                        <div className="space-y-2 flex-1 overflow-y-auto">
                            <p className="text-xs text-text-secondary">Drop items here</p>
                        </div>
                    </div>
                );
            case 'color':
                return (
                    <div className="w-full h-full flex flex-col justify-end p-2" style={{ backgroundColor: item.content.hex }}>
                        <div className="bg-black/60 rounded px-1 py-0.5 w-full">
                            <p className="font-semibold text-white text-xs truncate">{item.content.text}</p>
                            <p className="font-mono text-xs text-white/80">{item.content.hex}</p>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    }

    const getCursorClass = () => {
        if (isConnecting) return 'cursor-pointer';
        if (interactionMode === 'move') return 'cursor-grab active:cursor-grabbing';
        return 'cursor-default';
    }

    const isDropTarget = item.type === 'column' && draggedOverColumnId === item.id;

    return (
        <div
            className={`absolute bg-glass border border-border-color rounded-lg shadow-lg overflow-hidden transition-all duration-100 touch-none group ${getCursorClass()} ${isConnecting ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''} ${isDropTarget ? 'ring-2 ring-primary border-primary' : ''}`}
            style={{
                left: item.position.x,
                top: item.position.y,
                width: item.size.width,
                height: item.size.height,
                zIndex: item.type === 'column' ? 5 : 10
            }}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            onClick={onClick}
            onDoubleClick={() => onEdit(item)}
        >
            <div className="w-full h-full" style={{ pointerEvents: interactionMode === 'move' ? 'auto' : 'none' }}>
                {renderContent()}
            </div>
             {interactionMode === 'move' && (
                 <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    {item.type === 'image' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDownloadRequest(item); }}
                            title="Download Item"
                            className="h-6 w-6 bg-black/40 rounded-full flex items-center justify-center text-white hover:bg-blue-500"
                        >
                            <DownloadIcon className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                        title="Edit Item"
                        className="h-6 w-6 bg-black/40 rounded-full flex items-center justify-center text-white hover:bg-yellow-500"
                    >
                        <EditIcon className="h-4 w-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                        title="Delete Item"
                        className="h-6 w-6 bg-black/40 rounded-full flex items-center justify-center text-white hover:bg-red-500"
                    >
                        <DeleteIcon className="h-4 w-4" />
                    </button>
                </div>
            )}
            {interactionMode === 'move' && !isConnecting && item.type !== 'color' && (
                 <div
                    onMouseDown={handleResizeStart}
                    onTouchStart={handleResizeStart}
                    className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end"
                >
                   <div className="w-3 h-3 bg-primary/50 group-hover:bg-primary rounded-tl-lg"></div>
                </div>
            )}
        </div>
    );
};

export default MoodboardItemComponent;