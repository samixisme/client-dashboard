import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, forwardRef } from 'react';
import { useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { doc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { Moodboard, MoodboardItem, MoodboardItemType, MoodboardItemStyle } from '../types';
import MoodboardItemComponent from '../components/moodboard/MoodboardItemComponent';
import ConnectorLine from '../components/moodboard/ConnectorLine';
import MoodboardListView from '../components/moodboard/MoodboardListView';
import DownloadMoodboardModal from '../components/moodboard/DownloadMoodboardModal';
import InspectorPanel from '../components/moodboard/InspectorPanel';
import ResourceSidebar from '../components/moodboard/ResourceSidebar';

import { 
    SidebarIcon, TextIcon, ImageIcon, LinkIcon, ColumnIcon, ConnectorIcon,
    FullscreenIcon, ExitFullscreenIcon, SaveIcon, UndoIcon, RedoIcon,
    ZoomInIcon, ZoomOutIcon, MoveIcon, PanIcon, ColorPaletteIcon, GridIcon,
    KanbanViewIcon, ListIcon, DownloadIcon, CenterFocusIcon
} from '../components/moodboard/Icons';
import ColorPopover from '../components/moodboard/ColorPopover';
import ViewSwitcher, { ViewOption } from '../components/board/ViewSwitcher';

declare const htmlToImage: {
    toPng: (node: HTMLElement, options?: { filter?: (node: HTMLElement) => boolean }) => Promise<string>;
    toJpeg: (node: HTMLElement, options?: { quality?: number; filter?: (node: HTMLElement) => boolean }) => Promise<string>;
};

const viewOptions: ViewOption[] = [
    { id: 'canvas', name: 'Canvas', Icon: KanbanViewIcon },
    { id: 'list', name: 'List', Icon: ListIcon },
];

const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;
const SNAP_SIZE = 20;
const CANVAS_SIZE = 5000;
const CANVAS_OFFSET = CANVAS_SIZE / 2;

const ToolbarButton = forwardRef<HTMLButtonElement, { onClick?: React.MouseEventHandler<HTMLButtonElement>; Icon: React.FC<{ className?: string }>; label: string; isActive?: boolean; disabled?: boolean }>(({ onClick, Icon, label, isActive = false, disabled = false }, ref) => (
    <button 
        ref={ref} 
        onClick={(e) => {
            if (onClick) onClick(e);
        }} 
        disabled={disabled} 
        aria-label={label} 
        title={label} 
        className={`flex items-center p-2 rounded-md transition-colors ${isActive ? 'bg-primary text-white' : 'bg-glass-light text-text-secondary'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary hover:text-white'}`}
    >
        <Icon className="h-5 w-5 flex-shrink-0" />
    </button>
));

const MoodboardCanvasPage = () => {
    const { moodboardId } = useParams<{ moodboardId: string }>();
    const { data } = useData();
    const [moodboard, setMoodboard] = useState<Moodboard | undefined>();
    
    // State history management
    const [history, setHistory] = useState<MoodboardItem[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [savedHistoryIndex, setSavedHistoryIndex] = useState(0);

    const items = history[historyIndex] || [];
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;
    const isDirty = historyIndex !== savedHistoryIndex;

    const [connecting, setConnecting] = useState<{ startItemId: string | null; startHandle?: 'top' | 'right' | 'bottom' | 'left' }>({ startItemId: null });

    const fullscreenContainerRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    
    // Interaction states
    const [viewMode, setViewMode] = useState<'canvas' | 'list'>('canvas');
    const [interactionMode, setInteractionMode] = useState<'move' | 'pan'>('move');
    const [draggedItem, setDraggedItem] = useState<{ id: string, offset: { x: number, y: number } } | null>(null);
    const [panningState, setPanningState] = useState<{ startX: number; startY: number; scrollLeft: number; scrollTop: number; } | null>(null);
    const [draggedOverColumnId, setDraggedOverColumnId] = useState<string | null>(null);
    
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    
    // Zoom state
    const [zoom, setZoom] = useState(1);
    const [postZoomScroll, setPostZoomScroll] = useState<{x: number, y: number} | null>(null);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [isLibraryOpen, setIsLibraryOpen] = useState(true);

    // Inspector & Selection
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [isInspectorOpen, setIsInspectorOpen] = useState(false);

    // Transient State for performance optimization (Dragging/Resizing)
    const [transientState, setTransientState] = useState<{
        draggedItemId?: string;
        currentPosition?: { x: number, y: number };
        resizedItemId?: string;
        currentSize?: { width: number, height: number };
        initialMousePos?: { x: number, y: number };
        initialSize?: { width: number, height: number };
        offset?: { x: number, y: number };
    }>({});
    
    // Color Popover State
    const [isColorPopoverOpen, setIsColorPopoverOpen] = useState(false);
    const colorButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (moodboardId) {
            setMoodboard(data.moodboards.find(m => m.id === moodboardId));
            const filteredItems = data.moodboardItems.filter(i => i.moodboardId === moodboardId);
            setHistory([filteredItems]);
            setHistoryIndex(0);
            setSavedHistoryIndex(0);
        }
    }, [moodboardId, data.moodboards, data.moodboardItems]);
    
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

        if (minX === Infinity) {
            return;
        }

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const padding = 200;

        const viewportWidth = viewport.clientWidth;
        const viewportHeight = viewport.clientHeight;

        const zoomX = viewportWidth / (contentWidth + padding * 2);
        const zoomY = viewportHeight / (contentHeight + padding * 2);
        const newZoom = Math.max(MIN_ZOOM, Math.min(zoomX, zoomY, 1));

        // Calculate center relative to CANVAS_OFFSET
        const contentCenterX = minX + contentWidth / 2 + CANVAS_OFFSET;
        const contentCenterY = minY + contentHeight / 2 + CANVAS_OFFSET;

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
                    if (!currentIds.has(item.id)) {
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
            const isHorizontal = column.content.layout === 'horizontal';
            let currentX = PADDING;
            let currentY = HEADER_HEIGHT + PADDING;
            let maxWidth = 0;
            let maxHeight = 0;

            for (const child of children) {
                const childIndex = newItems.findIndex((i: MoodboardItem) => i.id === child.id);
                const newChildX = column.position.x + currentX;
                const newChildY = column.position.y + currentY;
                
                if (newItems[childIndex].position.x !== newChildX || newItems[childIndex].position.y !== newChildY) {
                    newItems[childIndex].position.x = newChildX;
                    newItems[childIndex].position.y = newChildY;
                    needsUpdate = true;
                }
                
                if (isHorizontal) {
                    currentX += child.size.width + PADDING;
                    maxHeight = Math.max(maxHeight, child.size.height);
                } else {
                    currentY += child.size.height + PADDING;
                    maxWidth = Math.max(maxWidth, child.size.width);
                }
            }

            const columnIndex = newItems.findIndex((i: MoodboardItem) => i.id === column.id);
            const newHeight = isHorizontal ? (HEADER_HEIGHT + PADDING + maxHeight + PADDING) : (children.length > 0 ? currentY : 150);
            const newWidth = isHorizontal ? (children.length > 0 ? currentX : 250) : (children.length > 0 ? maxWidth + PADDING * 2 : 250);

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
        const canvasX = (mouseX - rect.left + viewportRef.current.scrollLeft) / zoom - CANVAS_OFFSET;
        const canvasY = (mouseY - rect.top + viewportRef.current.scrollTop) / zoom - CANVAS_OFFSET;
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

        if ((transientState.draggedItemId || transientState.resizedItemId) && interactionMode === 'move') e.preventDefault();
        
        const { x: canvasMouseX, y: canvasMouseY } = getCanvasCoords(e);

        if (transientState.draggedItemId && transientState.offset) {
            let newX = canvasMouseX - transientState.offset.x;
            let newY = canvasMouseY - transientState.offset.y;

            if (snapToGrid) {
                newX = Math.round(newX / SNAP_SIZE) * SNAP_SIZE;
                newY = Math.round(newY / SNAP_SIZE) * SNAP_SIZE;
            }

            setTransientState(prev => {
                if(prev.currentPosition?.x === newX && prev.currentPosition?.y === newY) return prev;
                return {
                    ...prev,
                    currentPosition: { x: newX, y: newY }
                };
            });
            
             const itemBeingDragged = items.find(i => i.id === transientState.draggedItemId);
             if(itemBeingDragged) {
                 const currentWidth = itemBeingDragged.size.width;
                 const currentHeight = itemBeingDragged.size.height;
                 const itemCenter = {
                     x: newX + currentWidth / 2,
                     y: newY + currentHeight / 2
                 };
                 let newDraggedOverColumnId: string | null = null;
                 const columns = items.filter(i => i.type === 'column' && i.id !== transientState.draggedItemId);
                 for (const column of columns) {
                     if (itemCenter.x > column.position.x && itemCenter.x < column.position.x + column.size.width &&
                         itemCenter.y > column.position.y && itemCenter.y < column.position.y + column.size.height) {
                         newDraggedOverColumnId = column.id;
                         break;
                     }
                 }
                 setDraggedOverColumnId(newDraggedOverColumnId);
             }

        } else if (transientState.resizedItemId && transientState.initialMousePos && transientState.initialSize) {
            const dx = (canvasMouseX - transientState.initialMousePos.x);
            const dy = (canvasMouseY - transientState.initialMousePos.y);

            let newWidth = Math.max(100, transientState.initialSize.width + dx);
            let newHeight = Math.max(50, transientState.initialSize.height + dy);

            if (snapToGrid) {
                newWidth = Math.round(newWidth / SNAP_SIZE) * SNAP_SIZE;
                newHeight = Math.round(newHeight / SNAP_SIZE) * SNAP_SIZE;
            }

            setTransientState(prev => {
                 if(prev.currentSize?.width === newWidth && prev.currentSize?.height === newHeight) return prev;
                 return {
                    ...prev,
                    currentSize: { width: newWidth, height: newHeight }
                };
            });
        }
    }, [transientState, getCanvasCoords, panningState, interactionMode, items, snapToGrid]);

    const handlePointerUp = useCallback(() => {
        document.body.classList.remove('is-dragging');

        if (transientState.draggedItemId && transientState.currentPosition) {
            setItems(prevItems => prevItems.map(item => 
                item.id === transientState.draggedItemId 
                    ? { ...item, position: transientState.currentPosition!, parentId: draggedOverColumnId || undefined } 
                    : item
            ), true);
        } else if (transientState.resizedItemId && transientState.currentSize) {
            setItems(prevItems => prevItems.map(item =>
                item.id === transientState.resizedItemId
                    ? { ...item, size: transientState.currentSize! }
                    : item
            ), true);
        }
        
        setTransientState({});
        setPanningState(null);
        setDraggedOverColumnId(null);
    }, [transientState, setItems, draggedOverColumnId]);
    
    const handleItemDragStart = useCallback((itemId: string, e: React.MouseEvent | React.TouchEvent) => {
        if (interactionMode !== 'move') return;
        if(connecting.startItemId === 'pending') { setConnecting({ startItemId: itemId }); return; }
        if(connecting.startItemId) return;
        
        // Dragging doesn't toggle selection but ensures the dragged item is the "selected" context for the drag
        if (selectedItemId !== itemId) setSelectedItemId(itemId);
        // Dragging does NOT open inspector
        setIsInspectorOpen(false);

        const item = items.find(i => i.id === itemId);
        if (!item) return;

        const { x: canvasMouseX, y: canvasMouseY } = getCanvasCoords(e.nativeEvent);
        document.body.classList.add('is-dragging');
        
        setTransientState({
            draggedItemId: itemId,
            offset: { x: canvasMouseX - item.position.x, y: canvasMouseY - item.position.y },
            currentPosition: item.position 
        });
    }, [interactionMode, items, getCanvasCoords, connecting.startItemId, selectedItemId]);


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
    
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('app/moodboard-item');
        if (!data) return;

        try {
            const payload = JSON.parse(data);
            if (payload.type === 'resource') {
                const { x, y } = getCanvasCoords(e.nativeEvent);
                const now = new Date().toISOString();

                // Determine content based on resource type
                let content: MoodboardItem['content'] = {
                    resourceType: payload.resourceType,
                    referenceId: payload.resourceId,
                    title: payload.resourceData.name || payload.resourceData.title || 'Resource',
                    text: payload.resourceData.description || payload.resourceData.text || '',
                };

                const newItem: MoodboardItem = {
                    id: `item-${Date.now()}`,
                    moodboardId: moodboardId!,
                    type: 'card', 
                    content,
                    position: { x: x - 100, y: y - 50 }, // Center on mouse roughly
                    size: { width: 250, height: 150 },
                    creatorId: 'user-1',
                    createdAt: now,
                    updatedAt: now,
                };
                
                setItems(prev => [...prev, newItem], true);
                setSelectedItemId(newItem.id);
            }
        } catch (err) {
            console.error('Failed to parse drop data', err);
        }
    };

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
            // Use current viewport center for new item, converted to canvas coords
            position: { 
                x: (viewportRef.current.scrollLeft + viewportRef.current.clientWidth/2) / zoom - CANVAS_OFFSET, 
                y: (viewportRef.current.scrollTop + viewportRef.current.clientHeight/2) / zoom - CANVAS_OFFSET
            },
            size: type === 'image' ? { width: 400, height: 300 } : { width: 250, height: 150 },
            creatorId: 'user-1', createdAt: now, updatedAt: now,
        };
        // Scroll to new item? The user requested "Navigate to item".
        // We'll update state, and then scroll.
        setItems(prev => [...prev, newItem], true);
        
        // Center on new item
        // Calculate center relative to CANVAS_OFFSET
        const itemCenterX = newItem.position.x + newItem.size.width / 2 + CANVAS_OFFSET;
        const itemCenterY = newItem.position.y + newItem.size.height / 2 + CANVAS_OFFSET;

        const newScrollLeft = (itemCenterX * zoom) - (viewportRef.current.clientWidth / 2);
        const newScrollTop = (itemCenterY * zoom) - (viewportRef.current.clientHeight / 2);

        setPostZoomScroll({ x: newScrollLeft, y: newScrollTop });
        
        setSelectedItemId(newItem.id);
        setIsInspectorOpen(true); // Auto-open inspector for new items
    };
    
    const handleDeleteItem = (itemIdToDelete: string) => {
        setItems(prevItems => prevItems.filter(item => {
            if (item.id === itemIdToDelete) return false;
            // Also delete connected lines
            if (item.type === 'connector' && item.connector_ends && (item.connector_ends.start_item_id === itemIdToDelete || item.connector_ends.end_item_id === itemIdToDelete)) {
                return false;
            }
            return true;
        }), true);
        if(selectedItemId === itemIdToDelete) {
            setSelectedItemId(null);
            setIsInspectorOpen(false);
        }
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
        setItems(prevItems => prevItems.map(item => item.id === updatedItem.id ? updatedItem : item), false);
    };

    const addColorItem = (hex: string, name?: string) => {
         if (!moodboardId || !viewportRef.current) return null;
         const now = new Date().toISOString();
         return {
            id: `item-${Date.now()}-${Math.random()}`, moodboardId, type: 'color' as MoodboardItemType,
            content: { text: name, hex },
            position: { 
                x: (viewportRef.current.scrollLeft + viewportRef.current.clientWidth/2) / zoom - CANVAS_OFFSET + Math.random()*200 - 100, 
                y: (viewportRef.current.scrollTop + viewportRef.current.clientHeight/2) / zoom - CANVAS_OFFSET + Math.random()*200 - 100
            },
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

    const handleConnectHandle = (itemId: string, handle: 'top' | 'right' | 'bottom' | 'left', e: React.MouseEvent) => {
        e.stopPropagation();
        
        // If not strictly in "Connect Mode" (via toolbar), we could auto-enter it? 
        // For now, let's assume we must be in connecting mode OR we clicked a handle which implies intent.
        // Actually, handles only show if isConnecting is true. So we are safe.

        if (connecting.startItemId === 'pending') {
             // Starting a connection
             setConnecting({ startItemId: itemId, startHandle: handle });
             return;
        }

        if (connecting.startItemId && connecting.startItemId !== itemId) {
            // Completing a connection
            const now = new Date().toISOString();
            const newConnector: MoodboardItem = {
                id: `conn-${Date.now()}`, moodboardId: moodboardId!, type: 'connector', content: {},
                position: { x: 0, y: 0 }, size: { width: 0, height: 0 },
                connector_ends: { 
                    start_item_id: connecting.startItemId, 
                    end_item_id: itemId,
                    startHandle: connecting.startHandle,
                    endHandle: handle 
                },
                creatorId: 'user-1', createdAt: now, updatedAt: now,
            };
            setItems(prev => [...prev, newConnector], true);
            setConnecting({ startItemId: null });
        }
    };
    
    const handleReorderChild = (childId: string, direction: 'up' | 'down') => {
        setItems(prevItems => {
            const index = prevItems.findIndex(i => i.id === childId);
            if (index === -1) return prevItems;
            
            const child = prevItems[index];
            if (!child.parentId) return prevItems;

            // Find siblings in current order
            const siblings = prevItems
                .map((item, idx) => ({ item, idx }))
                .filter(({ item }) => item.parentId === child.parentId);
            
            const siblingIndex = siblings.findIndex(s => s.item.id === childId);
            if (siblingIndex === -1) return prevItems;

            const targetSiblingIndex = direction === 'up' ? siblingIndex - 1 : siblingIndex + 1;
            if (targetSiblingIndex < 0 || targetSiblingIndex >= siblings.length) return prevItems;

            const targetSibling = siblings[targetSiblingIndex];
            
            // Swap in the main array
            const newItems = [...prevItems];
            newItems[index] = targetSibling.item;
            newItems[targetSibling.idx] = child;
            
            return newItems;
        }, true); // Create history entry? Maybe strictly UI interaction, but order matters. Yes.
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
    
    const handleSave = async () => {
        if (isDirty && moodboardId) {
            const moodboard = data.moodboards.find(m => m.id === moodboardId);
            if (!moodboard) return;
            
            const projectId = moodboard.projectId;
            const currentItems = history[historyIndex];
            const batch = writeBatch(db);
            const itemsCollectionRef = collection(db, 'projects', projectId, 'moodboards', moodboardId, 'moodboard_items');

            try {
                const existingSnapshot = await getDocs(itemsCollectionRef);
                const existingIds = new Set(existingSnapshot.docs.map(d => d.id));
                const currentIds = new Set(currentItems.map(i => i.id));

                existingSnapshot.docs.forEach(d => {
                    if (!currentIds.has(d.id)) {
                        batch.delete(d.ref);
                    }
                });

                currentItems.forEach(item => {
                    const ref = doc(db, 'projects', projectId, 'moodboards', moodboardId, 'moodboard_items', item.id);
                    const itemData = JSON.parse(JSON.stringify(item));
                    delete itemData.moodboardId;
                    batch.set(ref, itemData, { merge: true });
                });

                await batch.commit();
                setSavedHistoryIndex(historyIndex);
            } catch (error) {
                console.error("Error saving moodboard:", error);
                alert("Failed to save changes. Please try again.");
            }
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

                const canvasPointX = (viewport.scrollLeft + mouseX) / oldZoom - CANVAS_OFFSET;
                const canvasPointY = (viewport.scrollTop + mouseY) / oldZoom - CANVAS_OFFSET;

                // New logical scroll (relative to origin)
                // newScroll = (CanvasPoint + Offset) * NewZoom - Mouse
                const newScrollLeft = ((canvasPointX + CANVAS_OFFSET) * newZoom) - mouseX;
                const newScrollTop = ((canvasPointY + CANVAS_OFFSET) * newZoom) - mouseY;

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

        const canvasPointX = (viewport.scrollLeft + viewportCenterX) / oldZoom - CANVAS_OFFSET;
        const canvasPointY = (viewport.scrollTop + viewportCenterY) / oldZoom - CANVAS_OFFSET;

        const newScrollLeft = ((canvasPointX + CANVAS_OFFSET) * newZoom) - viewportCenterX;
        const newScrollTop = ((canvasPointY + CANVAS_OFFSET) * newZoom) - viewportCenterY;
        
        setPostZoomScroll({ x: newScrollLeft, y: newScrollTop });
        setZoom(newZoom);
    };

    if (!moodboard) return <div>Moodboard not found</div>;

    const bottomToolbar = (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4 p-2 rounded-lg bg-glass border border-border-color shadow-lg z-30">
            {/* Library Toggle */}
            <div className="flex items-center">
                 <ToolbarButton onClick={() => setIsLibraryOpen(!isLibraryOpen)} Icon={SidebarIcon} label={isLibraryOpen ? "Hide Library" : "Show Library"} isActive={isLibraryOpen} />
            </div>
            
            <div className="w-px h-8 bg-border-color"></div>

            {/* Creation Group */}
            <div className="flex items-center gap-1">
                <ToolbarButton onClick={() => handleAddItem('text')} Icon={TextIcon} label="Add Text" />
                <ToolbarButton onClick={() => handleAddItem('image')} Icon={ImageIcon} label="Add Image" />
                <ToolbarButton onClick={() => handleAddItem('link')} Icon={LinkIcon} label="Add Link" />
                <ToolbarButton onClick={() => handleAddItem('column')} Icon={ColumnIcon} label="Add Column" />
                <ToolbarButton ref={colorButtonRef} onClick={() => setIsColorPopoverOpen(true)} Icon={ColorPaletteIcon} label="Add Colors" />
            </div>

            <div className="w-px h-8 bg-border-color"></div>

            {/* Interaction Group */}
             <div className="flex items-center">
                <ToolbarButton onClick={() => setConnecting({ startItemId: connecting.startItemId ? null : 'pending' })} Icon={ConnectorIcon} label={connecting.startItemId ? 'Cancel Connecting' : 'Connect Items'} isActive={!!connecting.startItemId} />
            </div>
        </div>
    );

    const zoomControls = (
         <div className="absolute bottom-6 right-6 flex items-center gap-1 p-2 rounded-lg bg-glass border border-border-color shadow-lg z-30">
            <ToolbarButton onClick={() => handleZoomAction(zoom - ZOOM_STEP)} Icon={ZoomOutIcon} label="Zoom Out" disabled={zoom <= MIN_ZOOM}/>
            <button onClick={() => handleZoomAction(1)} title="Reset zoom" className="text-sm font-semibold w-12 text-center text-text-secondary hover:text-text-primary transition-colors rounded-md py-2">{Math.round(zoom * 100)}%</button>
            <ToolbarButton onClick={() => handleZoomAction(zoom + ZOOM_STEP)} Icon={ZoomInIcon} label="Zoom In" disabled={zoom >= MAX_ZOOM}/>
            {viewMode === 'canvas' && (
                <>
                    <div className="w-px h-6 bg-border-color mx-1"></div>
                     <button onClick={() => recenterCanvas(true)} title="Recenter Content" className="p-2 rounded-lg text-text-secondary hover:bg-glass-light hover:text-primary transition-colors">
                        <CenterFocusIcon className="h-5 w-5"/>
                    </button>
                </>
            )}
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

            {/* Center Actions */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-glass border border-border-color p-1 rounded-lg shadow-sm z-30">
                <ToolbarButton onClick={handleSave} Icon={SaveIcon} label={isDirty ? "Save changes" : "No changes to save"} disabled={!isDirty} />
                <div className="w-px h-4 bg-border-color"></div>
                <ToolbarButton onClick={handleUndo} Icon={UndoIcon} label="Undo" disabled={!canUndo} />
                <ToolbarButton onClick={handleRedo} Icon={RedoIcon} label="Redo" disabled={!canRedo} />
                <div className="w-px h-4 bg-border-color"></div>
                 <button 
                  onClick={() => setSnapToGrid(!snapToGrid)}
                  title={snapToGrid ? "Disable Grid Snapping" : "Enable Grid Snapping"} 
                  className={`p-2 rounded-md transition-colors ${snapToGrid ? 'bg-primary/20 text-primary' : 'bg-glass-light text-text-secondary hover:text-text-primary'}`}
                >
                    <GridIcon className="h-5 w-5" />
                </button>
            </div>

            <div className="flex items-center gap-2">
                <ViewSwitcher currentView={viewMode} onSwitchView={(v) => setViewMode(v as 'canvas' | 'list')} options={viewOptions} widthClass="w-36"/>
                <ToolbarButton onClick={() => setIsDownloadModalOpen(true)} Icon={DownloadIcon} label="Download Moodboard" />
                <ToolbarButton onClick={toggleFullscreen} Icon={isFullscreen ? ExitFullscreenIcon : FullscreenIcon} label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'} />
            </div>
        </div>
    );

    return (
        <div ref={fullscreenContainerRef} className={`h-full flex flex-col relative ${isFullscreen ? 'bg-background fixed inset-0 z-50' : ''}`}>
             {!isFullscreen && header} {/* Render header outside in normal mode */}
            
            {viewMode === 'canvas' ? (
                 <div className="flex-1 flex overflow-hidden">
                    {/* Resource Sidebar - Dockable */}
                    <div 
                        className={`transition-all duration-300 ease-in-out border-r border-border-color overflow-hidden ${isLibraryOpen ? 'w-64 opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-full border-r-0'}`}
                    >
                         <div className="w-64 h-full">
                            <ResourceSidebar />
                         </div>
                    </div>

                    <div className="flex-1 flex flex-col relative min-w-0">
                         {isFullscreen && header} 

                        {/* CANVAS */}
                        <div 
                            ref={viewportRef}
                            className={`flex-1 overflow-auto relative bg-glass-light custom-scrollbar cursor-${interactionMode === 'pan' ? 'grab' : 'default'} ${panningState ? 'cursor-grabbing' : ''}`}
                            onMouseDown={handlePanStart}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onDoubleClick={(e) => {
                                // Double clicking on background can deselect
                                if(e.target === viewportRef.current || e.target === canvasRef.current?.parentElement) {
                                  setSelectedItemId(null);
                                  setIsInspectorOpen(false);
                                }
                            }}
                        >
                            <div 
                                style={{ 
                                    width: `${CANVAS_SIZE * zoom}px`, 
                                    height: `${CANVAS_SIZE * zoom}px`, 
                                    minWidth: '100%', 
                                    minHeight: '100%',
                                    position: 'relative',
                                    overflow: 'hidden' // Ensure no unexpected overflow
                                }}
                            >
                                <div ref={canvasRef} className="absolute top-0 left-0" style={{ 
                                    width: `${CANVAS_SIZE}px`, 
                                    height: `${CANVAS_SIZE}px`, 
                                    transform: `scale(${zoom})`, 
                                    transformOrigin: 'top left' 
                                }}>
                                    <div className="absolute top-0 left-0 w-full h-full" style={{ transform: `translate(${CANVAS_OFFSET}px, ${CANVAS_OFFSET}px)` }}>
                                        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 1, overflow: 'visible' }}>
                                            {items.filter(i => i.type === 'connector').map(connector => <ConnectorLine key={connector.id} connector={connector} items={items} onDelete={handleDeleteItem} />)}
                                        </svg>
                                        {items.filter(i => i.type !== 'connector').map(item => (
                                            <MoodboardItemComponent 
                                                key={item.id} 
                                                item={item} 
                                                items={items} 
                                                onDragStart={handleItemDragStart} 
                                                onResizeStart={(e) => { 
                                                    if (interactionMode !== 'move') return; 
                                                    e.stopPropagation(); 
                                                    document.body.classList.add('is-dragging'); 
                                                    const { x, y } = getCanvasCoords(e.nativeEvent); 
                                                    setTransientState({
                                                        resizedItemId: item.id,
                                                        initialSize: item.size,
                                                        initialMousePos: { x, y },
                                                        currentSize: item.size
                                                    });
                                                }} 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Single Click: Select only, do NOT open inspector unless already open
                                                    setSelectedItemId(item.id);
                                                    // We don't change isInspectorOpen here, so if it's closed it stays closed.
                                                    // If user wants to edit they must double click or click "Edit"
                                                }}
                                                onDoubleClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedItemId(item.id);
                                                    setIsInspectorOpen(true);
                                                }}
                                                onDelete={handleDeleteItem} 
                                                onDownloadRequest={handleDownloadItem} 
                                                onEdit={(item) => {
                                                    setSelectedItemId(item.id);
                                                    setIsInspectorOpen(true);
                                                }}
                                                isConnecting={connecting.startItemId !== null} // Show handles if we are in any connecting state (pending or active) 
                                                interactionMode={interactionMode} 
                                                draggedOverColumnId={draggedOverColumnId} 
                                                overridePosition={transientState.draggedItemId === item.id ? transientState.currentPosition : undefined}
                                                overrideSize={transientState.resizedItemId === item.id ? transientState.currentSize : undefined}
                                                isSelected={selectedItemId === item.id}
                                                onConnectHandle={handleConnectHandle}
                                            />
                                        ))}
                                    </div>

                                </div>
                            </div>
                        </div>

                         {/* Overlay UI */}

                         {/* Bottom Toolbar (Creation) */}
                         {!isDownloadModalOpen && bottomToolbar}

                         {/* Zoom Controls (Bottom Right) */}
                         {!isDownloadModalOpen && zoomControls}

                         {/* Inspector Panel */}
                         {isInspectorOpen && selectedItemId && (
                            <InspectorPanel 
                                item={items.find(i => i.id === selectedItemId) || null} 
                                onUpdate={handleUpdateItem}
                                onClose={() => { setSelectedItemId(null); setIsInspectorOpen(false); }}
                                onDelete={handleDeleteItem}
                                onDownload={handleDownloadItem}
                                items={items}
                                onReorderChild={handleReorderChild}
                            />
                         )}
                         
                         {/* Color Popover */}
                         {isColorPopoverOpen && (
                             <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-40">
                                 <ColorPopover 
                                     isOpen={true}
                                     anchorEl={colorButtonRef.current}
                                     onAddColor={(hex) => {
                                         handleAddColor(hex);
                                         setIsColorPopoverOpen(false);
                                     }}
                                     onAddMultipleColors={(colors) => {
                                         handleAddMultipleColors(colors);
                                         setIsColorPopoverOpen(false);
                                     }}
                                     onClose={() => setIsColorPopoverOpen(false)}
                                 />
                             </div>
                         )}
                         
                         {isDownloadModalOpen && (
                             <DownloadMoodboardModal
                                 isOpen={isDownloadModalOpen}
                                 items={items}
                                 canvasRef={canvasRef}
                                 onClose={() => setIsDownloadModalOpen(false)}
                             />
                         )}

                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-hidden p-6">
                    <MoodboardListView items={items} />
                </div>
            )}
        </div>
    );
};

export default MoodboardCanvasPage;