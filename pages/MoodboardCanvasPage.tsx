import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, forwardRef } from 'react';
import { useParams } from 'react-router-dom';
import { moodboards, moodboardItems as initialMoodboardItems } from '../data/moodboardData';
import { Moodboard, MoodboardItem, MoodboardItemType } from '../types';
import MoodboardItemComponent from '../components/moodboard/MoodboardItemComponent';
import ConnectorLine from '../components/moodboard/ConnectorLine';
import MoodboardListView from '../components/moodboard/MoodboardListView';
import DownloadMoodboardModal from '../components/moodboard/DownloadMoodboardModal';
import EditItemModal from '../components/moodboard/EditItemModal';
import { TextIcon } from '../components/icons/TextIcon';
import { ImageIcon } from '../components/icons/ImageIcon';
import { LinkIcon } from '../components/icons/LinkIcon';
import { ColumnIcon } from '../components/icons/ColumnIcon';
import { ConnectorIcon } from '../components/icons/ConnectorIcon';
import { FullscreenIcon } from '../components/icons/FullscreenIcon';
import { ExitFullscreenIcon } from '../components/icons/ExitFullscreenIcon';
import { SaveIcon } from '../components/icons/SaveIcon';
import { UndoIcon } from '../components/icons/UndoIcon';
import { RedoIcon } from '../components/icons/RedoIcon';
import { ZoomInIcon } from '../components/icons/ZoomInIcon';
import { ZoomOutIcon } from '../components/icons/ZoomOutIcon';
import { MoveIcon } from '../components/icons/MoveIcon';
import { PanIcon } from '../components/icons/PanIcon';
import { ColorPaletteIcon } from '../components/icons/ColorPaletteIcon';
import ColorPopover from '../components/moodboard/ColorPopover';
import ViewSwitcher, { ViewOption } from '../components/board/ViewSwitcher';
import { KanbanViewIcon } from '../components/icons/KanbanViewIcon';
import { ListIcon } from '../components/icons/ListIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import { CenterFocusIcon } from '../components/icons/CenterFocusIcon';

declare const htmlToImage: any;

const viewOptions: ViewOption[] = [
    { id: 'canvas', name: 'Canvas', Icon: KanbanViewIcon },
    { id: 'list', name: 'List', Icon: ListIcon },
];

const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;

const MoodboardCanvasPage = () => {
    const { moodboardId } = useParams<{ moodboardId: string }>();
    const [moodboard, setMoodboard] = useState<Moodboard | undefined>();
    
    // State history management
    const [history, setHistory] = useState<MoodboardItem[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [savedHistoryIndex, setSavedHistoryIndex] = useState(0);

    const items = history[historyIndex] || [];
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;
    const isDirty = historyIndex !== savedHistoryIndex;

    const [connecting, setConnecting] = useState<{ startItemId: string | null }>({ startItemId: null });

    const fullscreenContainerRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    
    // Interaction states
    const [viewMode, setViewMode] = useState<'canvas' | 'list'>('canvas');
    const [interactionMode, setInteractionMode] = useState<'move' | 'pan'>('move');
    const [draggedItem, setDraggedItem] = useState<{ id: string, offset: { x: number, y: number } } | null>(null);
    const [resizedItem, setResizedItem] = useState<{ id: string, initialSize: {width: number, height: number}, initialMousePos: {x: number, y: number} } | null>(null);
    const [panningState, setPanningState] = useState<{ startX: number; startY: number; scrollLeft: number; scrollTop: number; } | null>(null);
    const [draggedOverColumnId, setDraggedOverColumnId] = useState<string | null>(null);
    
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    
    // Zoom state
    const [zoom, setZoom] = useState(1);
    const [postZoomScroll, setPostZoomScroll] = useState<{x: number, y: number} | null>(null);
    
    // Color Popover State
    const [isColorPopoverOpen, setIsColorPopoverOpen] = useState(false);
    const colorButtonRef = useRef<HTMLButtonElement>(null);
    
    // Edit Modal State
    const [editingItem, setEditingItem] = useState<MoodboardItem | null>(null);


    useEffect(() => {
        if (moodboardId) {
            setMoodboard(moodboards.find(m => m.id === moodboardId));
            
            const savedItemsJSON = localStorage.getItem(`moodboard_items_${moodboardId}`);
            if (savedItemsJSON) {
                try {
                    const savedItems = JSON.parse(savedItemsJSON);
                    setHistory([savedItems]);
                    setHistoryIndex(0);
                    setSavedHistoryIndex(0);
                } catch (error) {
                    console.error("Failed to parse saved moodboard state:", error);
                    const filteredItems = initialMoodboardItems.filter(i => i.moodboardId === moodboardId);
                    setHistory([filteredItems]);
                    setHistoryIndex(0);
                    setSavedHistoryIndex(0);
                }
            } else {
                const filteredItems = initialMoodboardItems.filter(i => i.moodboardId === moodboardId);
                setHistory([filteredItems]);
                setHistoryIndex(0);
                setSavedHistoryIndex(0);
            }
        }
    }, [moodboardId]);
    
    const recenterCanvas = useCallback((smooth = false) => {
        if (!viewportRef.current || !items.length) return;

        const viewport = viewportRef.current;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        items.forEach(item => {
            minX = Math.min(minX, item.position.x);
            minY = Math.min(minY, item.position.y);
            maxX = Math.max(maxX, item.position.x + item.size.width);
            maxY = Math.max(maxY, item.position.y + item.size.height);
        });

        if (minX === Infinity) return; // No items with position

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const padding = 200;

        const viewportWidth = viewport.clientWidth;
        const viewportHeight = viewport.clientHeight;

        const zoomX = viewportWidth / (contentWidth + padding * 2);
        const zoomY = viewportHeight / (contentHeight + padding * 2);
        const newZoom = Math.max(MIN_ZOOM, Math.min(zoomX, zoomY, 1));

        const contentCenterX = minX + contentWidth / 2;
        const contentCenterY = minY + contentHeight / 2;

        const newScrollLeft = (contentCenterX * newZoom) - (viewportWidth / 2);
        const newScrollTop = (contentCenterY * newZoom) - (viewportHeight / 2);
        
        setPostZoomScroll({ x: newScrollLeft, y: newScrollTop });
        setZoom(newZoom);

    }, [items]);

    useLayoutEffect(() => {
        if (items.length > 0 && viewportRef.current && viewMode === 'canvas') {
            setTimeout(() => {
                recenterCanvas(false);
            }, 100);
        }
    }, [moodboardId, viewMode]);

    useEffect(() => {
        const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    useLayoutEffect(() => {
        if (postZoomScroll && viewportRef.current) {
            viewportRef.current.scrollLeft = postZoomScroll.x;
            viewportRef.current.scrollTop = postZoomScroll.y;
            setPostZoomScroll(null);
        }
    }, [postZoomScroll]);

    const setItems = useCallback((updater: (prevItems: MoodboardItem[]) => MoodboardItem[], newHistoryEntry: boolean = false) => {
        setHistory(prevHistory => {
            const currentItems = prevHistory[historyIndex] || [];
            let newItems = updater(currentItems);

            if (JSON.stringify(currentItems) !== JSON.stringify(newItems)) {
                const now = new Date().toISOString();
                const currentIds = new Set(currentItems.map(i => i.id));
                newItems = newItems.map(item => {
                    if (!currentIds.has(item.id)) { // New item
                        return { ...item, createdAt: now, updatedAt: now, creatorId: 'user-1' };
                    }
                    const oldItem = currentItems.find(i => i.id === item.id);
                    if (JSON.stringify(oldItem) !== JSON.stringify(item)) {
                        return { ...item, updatedAt: now };
                    }
                    return item;
                });
            }


            if (JSON.stringify(currentItems) === JSON.stringify(newItems) && !newHistoryEntry) {
                return prevHistory;
            }

            if (newHistoryEntry) {
                const newHistorySlice = prevHistory.slice(0, historyIndex + 1);
                const newFullHistory = [...newHistorySlice, newItems];
                setHistoryIndex(newFullHistory.length - 1);
                return newFullHistory;
            } else {
                const newHistory = [...prevHistory];
                newHistory[historyIndex] = newItems;
                return newHistory;
            }
        });
    }, [historyIndex]);
    
    useLayoutEffect(() => {
        if (historyIndex < 0 || !history[historyIndex]) return;

        let needsUpdate = false;
        const currentItems = history[historyIndex];
        const newItems = JSON.parse(JSON.stringify(currentItems)); 

        const columns = newItems.filter((i: MoodboardItem) => i.type === 'column');
        
        for (const column of columns) {
            const children = newItems.filter((i: MoodboardItem) => i.parentId === column.id);
            
            const PADDING = 16;
            const HEADER_HEIGHT = 45;
            let currentY = HEADER_HEIGHT + PADDING;
            let maxWidth = 0;

            for (const child of children) {
                const childIndex = newItems.findIndex((i: MoodboardItem) => i.id === child.id);
                const newChildX = column.position.x + PADDING;
                const newChildY = column.position.y + currentY;
                
                if (newItems[childIndex].position.x !== newChildX || newItems[childIndex].position.y !== newChildY) {
                    newItems[childIndex].position.x = newChildX;
                    newItems[childIndex].position.y = newChildY;
                    needsUpdate = true;
                }
                
                currentY += child.size.height + PADDING;
                maxWidth = Math.max(maxWidth, child.size.width);
            }

            const columnIndex = newItems.findIndex((i: MoodboardItem) => i.id === column.id);
            const newHeight = children.length > 0 ? currentY : 150;
            const newWidth = children.length > 0 ? maxWidth + PADDING * 2 : 250;

            if (newItems[columnIndex].size.width !== newWidth || newItems[columnIndex].size.height !== newHeight) {
                newItems[columnIndex].size.width = newWidth;
                newItems[columnIndex].size.height = newHeight;
                needsUpdate = true;
            }
        }
        
        if (needsUpdate) {
            setItems(() => newItems, false);
        }
    }, [items]);


    const getCoords = (e: MouseEvent | TouchEvent) => 'touches' in e ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
    
    const getCanvasCoords = useCallback((e: MouseEvent | TouchEvent) => {
        if (!viewportRef.current) return { x: 0, y: 0 };
        const rect = viewportRef.current.getBoundingClientRect();
        const { x: mouseX, y: mouseY } = getCoords(e);
        const canvasX = (mouseX - rect.left + viewportRef.current.scrollLeft) / zoom;
        const canvasY = (mouseY - rect.top + viewportRef.current.scrollTop) / zoom;
        return { x: canvasX, y: canvasY };
    }, [zoom]);

    const handlePointerMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (panningState && viewportRef.current) {
            const { x: currentX, y: currentY } = getCoords(e);
            const dx = currentX - panningState.startX;
            const dy = currentY - panningState.startY;
            viewportRef.current.scrollLeft = panningState.scrollLeft - dx;
            viewportRef.current.scrollTop = panningState.scrollTop - dy;
            return;
        }

        if ((draggedItem || resizedItem) && interactionMode === 'move') e.preventDefault();
        
        const { x: canvasMouseX, y: canvasMouseY } = getCanvasCoords(e);

        if (draggedItem) {
            const itemBeingDragged = items.find(i => i.id === draggedItem.id);
            if(itemBeingDragged) {
                const itemCenter = {
                    x: canvasMouseX - draggedItem.offset.x + itemBeingDragged.size.width / 2,
                    y: canvasMouseY - draggedItem.offset.y + itemBeingDragged.size.height / 2
                };
                let newDraggedOverColumnId: string | null = null;
                const columns = items.filter(i => i.type === 'column' && i.id !== draggedItem.id);
                for (const column of columns) {
                    if (itemCenter.x > column.position.x && itemCenter.x < column.position.x + column.size.width &&
                        itemCenter.y > column.position.y && itemCenter.y < column.position.y + column.size.height) {
                        newDraggedOverColumnId = column.id;
                        break;
                    }
                }
                setDraggedOverColumnId(newDraggedOverColumnId);
            }

            setItems(prevItems => prevItems.map(item =>
                item.id === draggedItem.id
                    ? { ...item, position: { x: canvasMouseX - draggedItem.offset.x, y: canvasMouseY - draggedItem.offset.y } }
                    : item
            ));
        }
        if (resizedItem) {
            const dx = (canvasMouseX - resizedItem.initialMousePos.x);
            const dy = (canvasMouseY - resizedItem.initialMousePos.y);

            setItems(prevItems => prevItems.map(item => {
                if (item.id === resizedItem.id) {
                    const newWidth = Math.max(100, resizedItem.initialSize.width + dx);
                    const newHeight = Math.max(50, resizedItem.initialSize.height + dy);
                    return { ...item, size: { width: newWidth, height: newHeight } };
                }
                return item;
            }));
        }
    }, [draggedItem, resizedItem, getCanvasCoords, panningState, interactionMode, setItems, items]);

    const handlePointerUp = useCallback(() => {
        document.body.classList.remove('is-dragging');

        if (draggedItem) {
            setItems(prevItems => prevItems.map(item => 
                item.id === draggedItem.id 
                    ? { ...item, parentId: draggedOverColumnId || undefined } 
                    : item
            ), true);
        } else if (resizedItem) {
            setItems(current => current, true);
        }
        
        setDraggedItem(null);
        setResizedItem(null);
        setPanningState(null);
        setDraggedOverColumnId(null);
    }, [draggedItem, resizedItem, setItems, draggedOverColumnId]);
    
    const handleItemDragStart = useCallback((itemId: string, e: React.MouseEvent | React.TouchEvent) => {
        if (interactionMode !== 'move') return;
        if(connecting.startItemId === 'pending') { setConnecting({ startItemId: itemId }); return; }
        if(connecting.startItemId) return;

        const item = items.find(i => i.id === itemId);
        if (!item) return;

        const { x: canvasMouseX, y: canvasMouseY } = getCanvasCoords(e.nativeEvent);
        document.body.classList.add('is-dragging');
        setDraggedItem({ id: itemId, offset: { x: canvasMouseX - item.position.x, y: canvasMouseY - item.position.y } });
    }, [interactionMode, items, getCanvasCoords, connecting.startItemId]);


    useEffect(() => {
        document.addEventListener('mousemove', handlePointerMove);
        document.addEventListener('mouseup', handlePointerUp);
        document.addEventListener('touchmove', handlePointerMove, { passive: false });
        document.addEventListener('touchend', handlePointerUp);
        return () => {
            document.removeEventListener('mousemove', handlePointerMove);
            document.removeEventListener('mouseup', handlePointerUp);
            document.removeEventListener('touchmove', handlePointerMove);
            document.removeEventListener('touchend', handlePointerUp);
        };
    }, [handlePointerMove, handlePointerUp]);

    const handlePanStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (interactionMode !== 'pan' || (e.target as HTMLElement).closest('.moodboard-item-component')) return;
        if (!viewportRef.current) return;
        e.preventDefault();
        document.body.classList.add('is-dragging');
        const { x: startX, y: startY } = getCoords(e.nativeEvent);
        setPanningState({ startX, startY, scrollLeft: viewportRef.current.scrollLeft, scrollTop: viewportRef.current.scrollTop });
    };

    const handleAddItem = (type: MoodboardItemType) => {
        if (!moodboardId || !viewportRef.current) return;
        const now = new Date().toISOString();
        const newItem: MoodboardItem = {
            id: `item-${Date.now()}`, moodboardId, type,
            content: type === 'column' ? { title: 'New Column'} : {},
            position: { x: (viewportRef.current.scrollLeft + 100) / zoom, y: (viewportRef.current.scrollTop + 100) / zoom },
            size: type === 'image' ? { width: 400, height: 300 } : { width: 250, height: 150 },
            creatorId: 'user-1', createdAt: now, updatedAt: now,
        };
        setItems(prev => [...prev, newItem], true);
    };
    
    const handleDeleteItem = (itemIdToDelete: string) => {
        setItems(prevItems => prevItems.filter(item => {
            if (item.id === itemIdToDelete) return false;
            if (item.type === 'connector' && item.connector_ends && (item.connector_ends.start_item_id === itemIdToDelete || item.connector_ends.end_item_id === itemIdToDelete)) {
                return false;
            }
            return true;
        }), true);
    };
    
    const handleDownloadItem = useCallback(async (item: MoodboardItem) => {
        if (item.type !== 'image' || !item.content.imageUrl) {
            alert("Only image items can be downloaded directly.");
            return;
        }

        try {
            const response = await fetch(item.content.imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const filename = item.content.imageUrl.split('/').pop() || 'image.jpg';
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            console.error("Download failed:", error);
            alert("Failed to download image. It may be due to cross-origin restrictions.");
        }
    }, []);

    const handleUpdateItem = (updatedItem: MoodboardItem) => {
        setItems(prevItems => prevItems.map(item => item.id === updatedItem.id ? updatedItem : item), true);
        setEditingItem(null);
    };

    const addColorItem = (hex: string, name?: string) => {
         if (!moodboardId || !viewportRef.current) return null;
         const now = new Date().toISOString();
         return {
            id: `item-${Date.now()}-${Math.random()}`, moodboardId, type: 'color' as MoodboardItemType,
            content: { text: name, hex },
            position: { x: (viewportRef.current.scrollLeft / zoom) + 100 + Math.random()*200, y: (viewportRef.current.scrollTop / zoom) + 100 + Math.random()*200 },
            size: { width: 100, height: 100 },
            creatorId: 'user-1', createdAt: now, updatedAt: now,
        };
    }

    const handleAddColor = (hex: string) => {
        const newItem = addColorItem(hex);
        if (newItem) setItems(prev => [...prev, newItem], true);
    };

    const handleAddMultipleColors = (colors: { name: string, hex: string }[]) => {
        const newItems = colors.map(color => addColorItem(color.hex, color.name)).filter(Boolean) as MoodboardItem[];
        if (newItems.length > 0) setItems(prev => [...prev, ...newItems], true);
    };

    const handleItemClick = (itemId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (interactionMode !== 'move' || !connecting.startItemId) return;
        if (connecting.startItemId === itemId) return;
        const now = new Date().toISOString();
        const newConnector: MoodboardItem = {
            id: `conn-${Date.now()}`, moodboardId: moodboardId!, type: 'connector', content: {},
            position: { x: 0, y: 0 }, size: { width: 0, height: 0 },
            connector_ends: { start_item_id: connecting.startItemId, end_item_id: itemId },
            creatorId: 'user-1', createdAt: now, updatedAt: now,
        };
        setItems(prev => [...prev, newConnector], true);
        setConnecting({ startItemId: null });
    };

    const toggleFullscreen = () => {
        const element = fullscreenContainerRef.current;
        if (!element) return;
        if (!document.fullscreenElement) {
            element.requestFullscreen().catch(err => alert(`Error: ${err.message}`));
        } else {
            document.exitFullscreen();
        }
    };

    const handleUndo = () => canUndo && setHistoryIndex(i => i - 1);
    const handleRedo = () => canRedo && setHistoryIndex(i => i + 1);
    
    const handleSave = () => {
        if (isDirty && moodboardId) {
            localStorage.setItem(`moodboard_items_${moodboardId}`, JSON.stringify(history[historyIndex]));
            setSavedHistoryIndex(historyIndex);
        }
    };
    
    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport || viewMode !== 'canvas') return;
    
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                
                const oldZoom = zoom;
                const zoomFactor = 1 - e.deltaY * 0.005;
                const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * zoomFactor));

                if (newZoom === oldZoom) return;

                const rect = viewport.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                const canvasPointX = (viewport.scrollLeft + mouseX) / oldZoom;
                const canvasPointY = (viewport.scrollTop + mouseY) / oldZoom;

                const newScrollLeft = (canvasPointX * newZoom) - mouseX;
                const newScrollTop = (canvasPointY * newZoom) - mouseY;

                setPostZoomScroll({ x: newScrollLeft, y: newScrollTop });
                setZoom(newZoom);
            }
        };
    
        viewport.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            if (viewport) {
                viewport.removeEventListener('wheel', handleWheel);
            }
        };
    }, [zoom, viewMode]);

    const handleZoomAction = (newZoomValue: number) => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoomValue));
        if (newZoom === zoom) return;
        
        const oldZoom = zoom;
        const viewportCenterX = viewport.clientWidth / 2;
        const viewportCenterY = viewport.clientHeight / 2;

        const canvasPointX = (viewport.scrollLeft + viewportCenterX) / oldZoom;
        const canvasPointY = (viewport.scrollTop + viewportCenterY) / oldZoom;

        const newScrollLeft = (canvasPointX * newZoom) - viewportCenterX;
        const newScrollTop = (canvasPointY * newZoom) - viewportCenterY;
        
        setPostZoomScroll({ x: newScrollLeft, y: newScrollTop });
        setZoom(newZoom);
    };

    if (!moodboard) return <div>Moodboard not found</div>;
    
    const ToolbarButton = forwardRef<HTMLButtonElement, { onClick?: React.MouseEventHandler<HTMLButtonElement>; Icon: React.FC<any>; label: string; isActive?: boolean; disabled?: boolean }>(({ onClick, Icon, label, isActive = false, disabled = false }, ref) => (
         <button ref={ref} onClick={onClick} disabled={disabled} aria-label={label} title={label} className={`flex items-center p-2 rounded-md transition-colors ${isActive ? 'bg-primary text-white' : 'bg-glass-light text-text-secondary'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary hover:text-white'}`}>
            <Icon className="h-5 w-5 flex-shrink-0" />
        </button>
    ));

    const canvasContent = (
        <div ref={canvasRef} className="relative w-[5000px] h-[5000px] transform-origin-top-left" style={{ transform: `scale(${zoom})` }}>
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                {items.filter(i => i.type === 'connector').map(connector => <ConnectorLine key={connector.id} connector={connector} items={items} onDelete={handleDeleteItem} />)}
            </svg>
            {items.filter(i => i.type !== 'connector').map(item => <MoodboardItemComponent key={item.id} item={item} items={items} onDragStart={handleItemDragStart} onResizeStart={(e) => { if (interactionMode !== 'move') return; e.stopPropagation(); document.body.classList.add('is-dragging'); const { x, y } = getCanvasCoords(e.nativeEvent); setResizedItem({ id: item.id, initialSize: item.size, initialMousePos: { x, y }}); }} onClick={(e) => handleItemClick(item.id, e)} onDelete={handleDeleteItem} onDownloadRequest={handleDownloadItem} onEdit={setEditingItem} isConnecting={connecting.startItemId === item.id || connecting.startItemId === 'pending'} interactionMode={interactionMode} draggedOverColumnId={draggedOverColumnId} />)}
        </div>
    );

    const bottomToolbar = (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 p-2 rounded-lg bg-glass border border-border-color shadow-lg">
            <div className="flex items-center gap-1">
                <ToolbarButton onClick={handleSave} Icon={SaveIcon} label={isDirty ? "Save changes" : "No changes to save"} disabled={!isDirty} />
                <ToolbarButton onClick={handleUndo} Icon={UndoIcon} label="Undo" disabled={!canUndo} />
                <ToolbarButton onClick={handleRedo} Icon={RedoIcon} label="Redo" disabled={!canRedo} />
            </div>
            <div className="flex items-center gap-1">
                <ToolbarButton onClick={() => handleAddItem('text')} Icon={TextIcon} label="Add Text" />
                <ToolbarButton onClick={() => handleAddItem('image')} Icon={ImageIcon} label="Add Image" />
                <ToolbarButton onClick={() => handleAddItem('link')} Icon={LinkIcon} label="Add Link" />
                <ToolbarButton onClick={() => handleAddItem('column')} Icon={ColumnIcon} label="Add Column" />
                <ToolbarButton onClick={() => setConnecting({ startItemId: connecting.startItemId ? null : 'pending' })} Icon={ConnectorIcon} label={connecting.startItemId ? 'Cancel Connecting' : 'Connect Items'} isActive={!!connecting.startItemId} />
                <ToolbarButton ref={colorButtonRef} onClick={() => setIsColorPopoverOpen(true)} Icon={ColorPaletteIcon} label="Add Colors" />
            </div>
            <div className="flex items-center gap-1">
                <ToolbarButton onClick={() => handleZoomAction(zoom - ZOOM_STEP)} Icon={ZoomOutIcon} label="Zoom Out" disabled={zoom <= MIN_ZOOM}/>
                <button onClick={() => handleZoomAction(1)} title="Reset zoom" className="text-sm font-semibold w-12 text-center text-text-secondary hover:text-text-primary transition-colors rounded-md py-2">{Math.round(zoom * 100)}%</button>
                <ToolbarButton onClick={() => handleZoomAction(zoom + ZOOM_STEP)} Icon={ZoomInIcon} label="Zoom In" disabled={zoom >= MAX_ZOOM}/>
            </div>
        </div>
    );

    const header = (
        <div className={`flex-shrink-0 flex justify-between items-center ${isFullscreen ? 'p-4' : 'pb-4'}`}>
            <div className="flex items-center gap-4">
                <h1 className="text-xl md:text-3xl font-bold text-text-primary">{moodboard.name}</h1>
                <div className="flex items-center bg-glass rounded-lg p-1 border border-border-color">
                    <button onClick={() => setInteractionMode('move')} title="Move/Select Mode" className={`p-2 rounded-md ${interactionMode === 'move' ? 'bg-primary text-background' : 'text-text-secondary hover:bg-glass-light'}`}>
                        <MoveIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => setInteractionMode('pan')} title="Pan Mode" className={`p-2 rounded-md ${interactionMode === 'pan' ? 'bg-primary text-background' : 'text-text-secondary hover:bg-glass-light'}`}>
                        <PanIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {viewMode === 'canvas' && isFullscreen && (
                    <button onClick={() => recenterCanvas(true)} title="Recenter Content" className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
                        <CenterFocusIcon className="h-5 w-5"/>
                    </button>
                )}
                <ViewSwitcher currentView={viewMode} onSwitchView={(v) => setViewMode(v as any)} options={viewOptions} widthClass="w-36"/>
                <ToolbarButton onClick={() => setIsDownloadModalOpen(true)} Icon={DownloadIcon} label="Download Moodboard" />
                <ToolbarButton onClick={toggleFullscreen} Icon={isFullscreen ? ExitFullscreenIcon : FullscreenIcon} label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'} />
            </div>
        </div>
    );

    return (
        <div ref={fullscreenContainerRef} className={`h-full flex flex-col relative ${isFullscreen ? 'bg-background fixed inset-0 z-50' : ''}`}>
            {viewMode === 'canvas' ? (
                isFullscreen ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {header}
                        <div className="flex-1 relative overflow-hidden">
                            <div className="absolute z-20 bottom-4 left-1/2 -translate-x-1/2 hidden md:flex">{bottomToolbar}</div>
                            <div ref={viewportRef} className={`absolute inset-0 ${interactionMode === 'pan' ? (panningState ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'} overflow-auto bg-glass border border-border-color rounded-lg`} onMouseDown={handlePanStart} onTouchStart={handlePanStart}>
                                {canvasContent}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {header}
                        <div className="flex-1 flex flex-col min-h-0">
                            <div ref={viewportRef} className={`flex-1 relative mb-4 ${interactionMode === 'pan' ? (panningState ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'} overflow-auto bg-glass border border-border-color rounded-lg`} onMouseDown={handlePanStart} onTouchStart={handlePanStart}>
                                {canvasContent}
                            </div>
                            <div className="flex-shrink-0 hidden md:flex justify-center">{bottomToolbar}</div>
                        </div>
                    </>
                )
            ) : (
                <>
                    {header}
                    <div className="flex-1 overflow-y-auto">
                      <MoodboardListView items={items} />
                    </div>
                </>
            )}

            {editingItem && (
                <EditItemModal
                    isOpen={!!editingItem}
                    item={editingItem}
                    onClose={() => setEditingItem(null)}
                    onSave={handleUpdateItem}
                />
            )}

            {isColorPopoverOpen && <ColorPopover isOpen={isColorPopoverOpen} onClose={() => setIsColorPopoverOpen(false)} anchorEl={colorButtonRef.current} onAddColor={handleAddColor} onAddMultipleColors={handleAddMultipleColors} />}
            {isDownloadModalOpen && <DownloadMoodboardModal isOpen={isDownloadModalOpen} onClose={() => setIsDownloadModalOpen(false)} items={items} canvasRef={canvasRef} />}
        </div>
    );
};

export default MoodboardCanvasPage;