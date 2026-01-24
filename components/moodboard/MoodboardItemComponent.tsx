import React from 'react';
import { MoodboardItem } from '../../types';
import { DeleteIcon } from '../icons/DeleteIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { EditIcon } from '../icons/EditIcon';
import { BoardIcon, TaskIcon, RoadmapIcon, CommentIcon } from './Icons';

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
    overridePosition?: { x: number; y: number };
    overrideSize?: { width: number; height: number };
    onDoubleClick?: (e: React.MouseEvent) => void;
    isSelected?: boolean;
    onConnectHandle?: (itemId: string, handle: 'top' | 'right' | 'bottom' | 'left', e: React.MouseEvent) => void;
}

const MoodboardItemComponent: React.FC<MoodboardItemProps> = ({ item, items, onDragStart, onResizeStart, onClick, onDelete, onDownloadRequest, onEdit, isConnecting, interactionMode, draggedOverColumnId, overridePosition, overrideSize, onDoubleClick, isSelected, onConnectHandle }) => {
    
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
            case 'text': {
                const textStyle = { 
                    padding: item.style?.padding ? `${item.style.padding}px` : '16px',
                    fontWeight: item.style?.fontWeight,
                    fontStyle: item.style?.fontStyle,
                    textDecoration: item.style?.textDecoration,
                    color: item.style?.textColor,
                };
                const textContent = item.content.text || 'Type something...';

                if (item.content.subtype === 'h1') return <h1 className="h-full w-full font-bold text-3xl leading-tight" style={textStyle}>{textContent}</h1>;
                if (item.content.subtype === 'h2') return <h2 className="h-full w-full font-bold text-xl leading-snug" style={textStyle}>{textContent}</h2>;
                if (item.content.subtype === 'quote') return <blockquote className="h-full w-full border-l-4 border-primary pl-4 italic text-lg" style={textStyle}>"{textContent}"</blockquote>;

                return <p className="h-full w-full whitespace-pre-wrap" style={textStyle}>{textContent}</p>;
            }
            case 'image':
                return <img 
                    src={item.content.imageUrl || 'https://picsum.photos/400/300'} 
                    className="w-full h-full" 
                    style={{ objectFit: item.style?.objectFit || 'cover' }}
                    alt="moodboard item" 
                    draggable="false" 
                    onDragStart={(e) => e.preventDefault()}
                />;
            case 'link':
                 const url = item.content.url;
                 const showPreview = item.content.showPreview;
                 const title = item.content.customTitle || item.content.text || url || 'New Link';
                 const description = item.content.description;
                 const previewImage = item.content.customImageUrl;

                 return (
                    <div className="h-full flex flex-col overflow-hidden">
                        {showPreview && previewImage && (
                            <div className="h-32 w-full bg-cover bg-center flex-shrink-0" style={{ backgroundImage: `url(${previewImage})` }} />
                        )}
                        <div className="p-3 flex flex-col flex-1 justify-between min-h-0 bg-glass/50">
                            <div>
                                 <p className="font-bold text-text-primary text-sm line-clamp-2 break-words" title={title}>{title}</p>
                                 {showPreview && description && <p className="text-xs text-text-secondary mt-1 line-clamp-3">{description}</p>}
                                 {!showPreview && <p className="text-xs text-text-secondary mt-1 truncate opacity-70">{url}</p>}
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if(url) window.open(url, '_blank', 'noopener,noreferrer');
                                }}
                                className="mt-2 self-start text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                            >
                                <span className="truncate max-w-[150px]">{url ? new URL(url).hostname : 'Open Link'}</span>
                                <span className="text-[10px]">↗</span>
                            </button>
                        </div>
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
            case 'card':
                // Determine icon based on resourceType or infer from title/text
                const Icon = item.content.resourceType === 'board' ? BoardIcon 
                           : item.content.resourceType === 'task' ? TaskIcon
                           : item.content.resourceType === 'roadmap' ? RoadmapIcon
                           : item.content.resourceType === 'comment' ? CommentIcon
                           : TaskIcon;
                
                return (
                    <div className="w-full h-full p-3 flex flex-col bg-glass border border-border-color rounded-lg">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border-color">
                             <div className="p-1 rounded bg-primary/10 text-primary">
                                 <Icon className="h-4 w-4" />
                             </div>
                             <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">{item.content.resourceType || 'Resource'}</span>
                        </div>
                        <h4 className="font-bold text-text-primary text-sm mb-1 line-clamp-2">{item.content.title}</h4>
                        <p className="text-xs text-text-secondary line-clamp-3">{item.content.text}</p>
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
            className={`absolute bg-glass border border-border-color rounded-lg shadow-lg overflow-hidden transition-all duration-100 touch-none group ${getCursorClass()} ${isConnecting ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''} ${isDropTarget ? 'ring-2 ring-primary border-primary' : ''} ${isSelected ? 'ring-2 ring-primary ring-offset-1 z-50' : ''}`}
            style={{
                left: overridePosition?.x ?? item.position.x,
                top: overridePosition?.y ?? item.position.y,
                width: overrideSize?.width ?? item.size.width,
                height: overrideSize?.height ?? item.size.height,
                zIndex: item.style?.zIndex ?? (item.type === 'column' ? 5 : 10),
                backgroundColor: item.style?.backgroundColor,
                color: item.style?.textColor,
                borderColor: item.style?.borderColor,
                borderWidth: item.style?.borderWidth ? `${item.style.borderWidth}px` : undefined,
                borderStyle: item.style?.borderStyle,
                borderRadius: item.style?.borderRadius ? `${item.style.borderRadius}px` : undefined,
                opacity: item.style?.opacity,
                fontSize: item.style?.fontSize ? `${item.style.fontSize}px` : undefined,
                boxShadow: item.style?.boxShadow,
            }}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            onClick={onClick}
            onDoubleClick={(e) => {
                if(onDoubleClick) onDoubleClick(e);
                else onEdit(item);
            }}
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
             {isConnecting && onConnectHandle && (
                <>
                    {/* Top Handle */}
                    <div 
                        className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary rounded-full cursor-pointer hover:scale-125 z-50 transition-transform"
                        onClick={(e) => { e.stopPropagation(); onConnectHandle(item.id, 'top', e); }}
                        title="Connect Top"
                    />
                    {/* Right Handle */}
                     <div 
                        className="absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary rounded-full cursor-pointer hover:scale-125 z-50 transition-transform"
                        onClick={(e) => { e.stopPropagation(); onConnectHandle(item.id, 'right', e); }}
                        title="Connect Right"
                    />
                    {/* Bottom Handle */}
                     <div 
                        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-4 h-4 bg-white border-2 border-primary rounded-full cursor-pointer hover:scale-125 z-50 transition-transform"
                        onClick={(e) => { e.stopPropagation(); onConnectHandle(item.id, 'bottom', e); }}
                        title="Connect Bottom"
                    />
                    {/* Left Handle */}
                     <div 
                        className="absolute top-1/2 left-0 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary rounded-full cursor-pointer hover:scale-125 z-50 transition-transform"
                        onClick={(e) => { e.stopPropagation(); onConnectHandle(item.id, 'left', e); }}
                        title="Connect Left"
                    />
                </>
            )}
        </div>
    );
};

export default MoodboardItemComponent;