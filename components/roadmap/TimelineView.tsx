import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { RoadmapItem, User, Task, Stage } from '../../types';
import { useData } from '../../contexts/DataContext';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { DragHandleIcon } from '../icons/DragHandleIcon';
import { backgroundPatterns } from '../../data/patterns';

// --- Helper Functions ---
const startOfDay = (date: Date | string) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

const addDays = (date: Date, days: number) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
};

const diffInDays = (date1: Date | string, date2: Date | string) => {
    const d1 = startOfDay(date1);
    const d2 = startOfDay(date2);
    return Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
};

const DAY_WIDTH = 40; // width of a single day column in pixels

type DraggableItem = (RoadmapItem | Task) & { _type: 'roadmap' | 'task' };

interface TimelineViewProps {
    items: RoadmapItem[];
    tasks: Task[];
    onUpdateItem: (item: RoadmapItem) => void;
    onUpdateTask: (task: Task) => void;
    onTaskClick: (task: Task) => void;
    onRoadmapItemClick: (item: RoadmapItem) => void;
    isEditMode: boolean;
    onReorderItems: (reorderedItems: RoadmapItem[]) => void;
    onReorderTasks: (reorderedTasks: Task[], parentId: string) => void;
    projectStartDate: string;
    projectEndDate: string;
}

const TimelineView: React.FC<TimelineViewProps> = ({ items, tasks, onUpdateItem, onUpdateTask, onTaskClick, onRoadmapItemClick, isEditMode, onReorderItems, onReorderTasks, projectStartDate, projectEndDate }) => {
    const { data } = useData();
    const { users, stages } = data;
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(items.map(i => i.id)));
    
    // Drag/Resize state for timeline bars
    const [dragState, setDragState] = useState<{ item: DraggableItem, mode: 'move' | 'resize-left' | 'resize-right', startX: number, originalItem: DraggableItem } | null>(null);
    const [ephemeralItem, setEphemeralItem] = useState<DraggableItem | null>(null);
    
    const timelineContainerRef = useRef<HTMLDivElement>(null);
    const wasDraggedRef = useRef(false);
    
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    useEffect(() => {
        // Collapse sidebar by default on mobile, but only on initial load
        if (window.innerWidth < 768) {
            setIsSidebarCollapsed(true);
        }
    }, []);

    const getStatusStyle = (item: RoadmapItem | Task) => {
        let status: RoadmapItem['status'] | string;
    
        if ('boardId' in item) { // is Task
            const stage = stages.find(s => s.id === item.stageId);
            status = stage?.name || 'Planned';
        } else { // is RoadmapItem
            status = item.status;
        }

        const primaryColor = 'hsl(84, 76%, 55%)'; // #A3E635
        const primaryColorTransparent = 'hsla(84, 76%, 55%, 0.4)';
    
        switch (status) {
            case 'In Progress':
                return { 
                    backgroundColor: primaryColorTransparent,
                    backgroundImage: `radial-gradient(hsla(84, 76%, 85%, 0.3) 20%, transparent 20%)`,
                    backgroundSize: '10px 10px',
                };
            case 'Completed':
                return { backgroundColor: primaryColor };
            case 'Planned':
            case 'Open':
            default:
                return {
                    backgroundColor: primaryColorTransparent,
                    backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 6px, hsla(84, 76%, 85%, 0.2) 6px, hsla(84, 76%, 85%, 0.2) 12px)`
                };
        }
    };


    const toggleExpand = (itemId: string) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };
    
    const sortedRoadmapItems = useMemo(() => [...items].sort((a,b) => (a.order || 0) - (b.order || 0)), [items]);
    const tasksByRoadmapItem = useMemo(() => {
        const map = new Map<string, Task[]>();
        tasks.forEach(task => {
            if(task.roadmapItemId) {
                if(!map.has(task.roadmapItemId)) {
                    map.set(task.roadmapItemId, []);
                }
                map.get(task.roadmapItemId)!.push(task);
            }
        });
        map.forEach(value => value.sort((a,b) => (a.order || 0) - (b.order || 0)));
        return map;
    }, [tasks]);

    const { startDate, endDate, months, totalDays } = useMemo(() => {
        if (!projectStartDate || !projectEndDate) {
            const today = new Date();
            return { startDate: today, endDate: addDays(today, 30), months: [], totalDays: 31 };
        }

        const pStartDate = new Date(projectStartDate);
        const pEndDate = new Date(projectEndDate);
        
        const finalStartDate = new Date(pStartDate.getFullYear(), pStartDate.getMonth() - 1, 1);
        const finalEndDate = new Date(pEndDate.getFullYear(), pEndDate.getMonth() + 2, 0);

        const dayCount = diffInDays(finalEndDate, finalStartDate) + 1;

        const m: { date: Date; days: number }[] = [];
        let current = new Date(finalStartDate);
        while (current <= finalEndDate) {
            const monthStart = new Date(current);
            const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
            const segmentEnd = new Date(Math.min(nextMonth.getTime() - 1, finalEndDate.getTime()));
            const daysInSegment = diffInDays(segmentEnd, monthStart) + 1;
            
            m.push({ date: monthStart, days: daysInSegment });
            current = new Date(nextMonth);
        }
        return { startDate: finalStartDate, endDate: finalEndDate, months: m, totalDays: dayCount };
    }, [projectStartDate, projectEndDate]);

    useEffect(() => {
        if (timelineContainerRef.current) {
            const allDatedItems = [
                ...items.filter(i => i.startDate && i.endDate),
                ...tasks.filter(t => t.start_date && t.dueDate)
            ];
    
            let centerDate = new Date(); // Default to today

            if (allDatedItems.length > 0) {
                const startDates = allDatedItems.map(item => {
                    if ('boardId' in item) { // It's a Task
                        return new Date(item.start_date!).getTime();
                    } else { // It's a RoadmapItem
                        return new Date(item.startDate).getTime();
                    }
                });
                const endDates = allDatedItems.map(item => {
                    if ('boardId' in item) { // It's a Task
                        return new Date(item.dueDate!).getTime();
                    } else { // It's a RoadmapItem
                        return new Date(item.endDate).getTime();
                    }
                });
                
                const minStart = Math.min(...startDates.filter(t => !isNaN(t)));
                const maxEnd = Math.max(...endDates.filter(t => !isNaN(t)));
        
                if(!isNaN(minStart) && !isNaN(maxEnd)) {
                    const midpointTime = minStart + (maxEnd - minStart) / 2;
                    centerDate = new Date(midpointTime);
                }
            }
    
            const midpointOffset = diffInDays(centerDate, startDate);
            const containerWidth = timelineContainerRef.current.offsetWidth;
            const scrollLeft = (midpointOffset * DAY_WIDTH) - (containerWidth / 2) + (DAY_WIDTH / 2);
    
            setTimeout(() => {
                if(timelineContainerRef.current) {
                    timelineContainerRef.current.scrollLeft = scrollLeft;
                }
            }, 0);
        }
    }, [startDate, items, tasks]);
    
    const gridWidth = totalDays * DAY_WIDTH;

    // --- Timeline Bar Drag & Resize Handlers ---
    const handleBarDragStart = (item: DraggableItem, mode: 'move' | 'resize-left' | 'resize-right', e: React.MouseEvent) => {
        if (!isEditMode) return;
        e.preventDefault();
        e.stopPropagation();
        wasDraggedRef.current = false;
        const currentItem = { ...item };
        setDragState({
            item: currentItem, mode, startX: e.clientX, originalItem: currentItem
        });
        setEphemeralItem(currentItem);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!dragState || !ephemeralItem) return;

        if (!wasDraggedRef.current && Math.abs(e.clientX - dragState.startX) > 3) {
            wasDraggedRef.current = true;
        }
        
        if (!wasDraggedRef.current) return;

        const dx = e.clientX - dragState.startX;
        const dayDelta = Math.round(dx / DAY_WIDTH);

        const isTask = ephemeralItem._type === 'task';
        const originalStartDate = new Date(isTask ? (dragState.originalItem as Task).start_date! : (dragState.originalItem as RoadmapItem).startDate);
        const originalEndDate = new Date(isTask ? (dragState.originalItem as Task).dueDate! : (dragState.originalItem as RoadmapItem).endDate);

        let newStartDate = new Date(originalStartDate);
        let newEndDate = new Date(originalEndDate);

        if (dragState.mode === 'move') {
            newStartDate = addDays(originalStartDate, dayDelta);
            newEndDate = addDays(originalEndDate, dayDelta);
        } else if (dragState.mode === 'resize-left') {
            newStartDate = addDays(originalStartDate, dayDelta);
            if (newStartDate > newEndDate) newStartDate = newEndDate;
        } else if (dragState.mode === 'resize-right') {
            newEndDate = addDays(originalEndDate, dayDelta);
            if (newEndDate < newStartDate) newEndDate = newStartDate;
        }

        if (isTask) {
            setEphemeralItem({
                ...ephemeralItem,
                start_date: newStartDate.toISOString(),
                dueDate: newEndDate.toISOString(),
            });
        } else {
            setEphemeralItem({
                ...ephemeralItem,
                startDate: newStartDate.toISOString(),
                endDate: newEndDate.toISOString(),
            } as DraggableItem);
        }
    }, [dragState, ephemeralItem]);

    const handleMouseUp = useCallback(() => {
        if (dragState && ephemeralItem && wasDraggedRef.current) {
            // Create a clean object to pass up, without internal properties like _type
            const { _type, ...cleanItem } = ephemeralItem;
            if (ephemeralItem._type === 'task') {
                onUpdateTask(cleanItem as Task);
            } else {
                onUpdateItem(cleanItem as RoadmapItem);
            }
        }
        setDragState(null);
        setEphemeralItem(null);
    }, [dragState, ephemeralItem, onUpdateTask, onUpdateItem]);


    useEffect(() => {
        if (dragState) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.classList.add('is-dragging');
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.classList.remove('is-dragging');
        };
    }, [dragState, handleMouseMove, handleMouseUp]);
    
    // --- Sidebar Reorder Handler ---
    const handleReorder = (result: DropResult) => {
        if (!result.destination) return;
        
        const { source, destination, type } = result;

        if (type === 'ROADMAP') {
            const reordered = Array.from(sortedRoadmapItems);
            const [moved] = reordered.splice(source.index, 1);
            reordered.splice(destination.index, 0, moved);
            onReorderItems(reordered);
        } else if (type === 'TASK') {
            // Reordering tasks within the same parent
            if (source.droppableId === destination.droppableId) {
                const parentId = source.droppableId;
                const itemsForParent = Array.from(tasksByRoadmapItem.get(parentId) || []);
                const [moved] = itemsForParent.splice(source.index, 1);
                itemsForParent.splice(destination.index, 0, moved);
                onReorderTasks(itemsForParent, parentId);
            }
        }
    };


    // --- Render Components ---
    const SidebarItem = ({item, displayOrder, provided}: {item: DraggableItem, displayOrder: string, provided?: { innerRef: (element: HTMLElement | null) => void; draggableProps: Record<string, unknown>; dragHandleProps?: Record<string, unknown> | null }}) => {
        const hasChildren = item._type === 'roadmap' && tasksByRoadmapItem.has(item.id);
        const itemLevel = item._type === 'task' ? 1 : 0;

        return (
            <div
                ref={provided?.innerRef}
                {...provided?.draggableProps}
                className="h-12 flex items-center border-b border-t border-primary/10 -mt-px bg-black/95 hover:bg-black/80 hover:border-primary/50 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 animate-fade-in-up cursor-pointer"
                style={provided?.draggableProps.style}
            >
                <div className="flex items-center gap-2 px-2 w-full">
                    {isEditMode && (
                        <div {...provided?.dragHandleProps} className="p-1 cursor-grab text-text-secondary">
                            <DragHandleIcon className="h-5 w-5"/>
                        </div>
                    )}

                    <div
                        className="flex-shrink-0 bg-glass/40 text-text-secondary font-mono text-xs rounded-md h-6 w-10 flex items-center justify-center border border-primary/20 shadow-sm"
                        style={{ marginLeft: `${itemLevel * 1.5}rem`}}
                    >
                        {displayOrder}
                    </div>

                    {!isSidebarCollapsed && (
                        <div className="flex items-center gap-1 overflow-hidden">
                            {hasChildren ? (
                                <button onClick={() => toggleExpand(item.id)} className="p-0.5 rounded-sm hover:bg-glass/60 hover:scale-110 transition-all duration-200 focus:ring-2 focus:ring-primary">
                                    <ChevronDownIcon className={`w-4 h-4 text-text-secondary transition-transform ${expandedItems.has(item.id) ? '' : '-rotate-90'}`} />
                                </button>
                            ) : (
                                <div className="w-5 flex-shrink-0"></div>
                            )}
                            <span className={`text-sm font-medium truncate ${item._type === 'roadmap' ? 'text-text-primary' : 'text-text-secondary'}`}>{item.title}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    const visibleItemCount = sortedRoadmapItems.length + Array.from(expandedItems).reduce((acc, id) => acc + (tasksByRoadmapItem.get(id)?.length || 0), 0);

    return (
        <div className="bg-glass/60 backdrop-blur-2xl rounded-2xl border border-primary/20 overflow-hidden h-full flex flex-col shadow-2xl shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] animate-fade-in relative">
            <div ref={timelineContainerRef} className="flex-1 overflow-auto custom-scrollbar">
                <div className="flex w-fit min-h-full">
                    {/* Sidebar */}
                    <div className={`sticky left-0 flex-shrink-0 border-r border-primary/30 bg-black/95 backdrop-blur-3xl shadow-[2px_0_15px_rgba(0,0,0,0.1)] z-20 transition-all duration-300 ${isSidebarCollapsed ? 'w-24' : 'w-80'}`}>
                        <div className={`h-16 flex items-center px-4 border-b border-primary/20 sticky top-0 bg-black/95 backdrop-blur-3xl z-30 shadow-xl shadow-[0_4px_15px_rgba(var(--primary-rgb),0.1)] ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                            <h3 className={`font-bold text-lg bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent transition-opacity duration-200 ${isSidebarCollapsed ? 'opacity-0 select-none absolute' : 'opacity-100'}`}>Tasks</h3>
                            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1.5 rounded-lg hover:bg-white/10 hover:border-primary/60 border border-transparent transition-all duration-200 hover:scale-110 hover:shadow-lg focus:ring-2 focus:ring-primary" title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                                <ChevronDownIcon className={`h-5 w-5 text-text-secondary transition-transform duration-300 ${isSidebarCollapsed ? '-rotate-90' : 'rotate-90'}`} />
                            </button>
                        </div>
                        <div>
                            <DragDropContext onDragEnd={handleReorder}>
                                <Droppable droppableId="roadmap-items" type="ROADMAP">
                                    {(provided) => (
                                        <div {...provided.droppableProps} ref={provided.innerRef}>
                                            {sortedRoadmapItems.map((item, index) => {
                                                const itemTasks = tasksByRoadmapItem.get(item.id) || [];
                                                const roadmapItemOrder = index + 1;
                                                return (
                                                    <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={!isEditMode}>
                                                        {(provided) => (
                                                            <div ref={provided.innerRef} {...(provided.draggableProps as any)}>
                                                                <SidebarItem item={{...item, _type: 'roadmap'}} displayOrder={`${roadmapItemOrder}`} provided={{...provided, draggableProps: provided.draggableProps as any, dragHandleProps: provided.dragHandleProps as any}} />
                                                                {expandedItems.has(item.id) && (
                                                                    <Droppable droppableId={item.id} type="TASK">
                                                                        {(provided) => (
                                                                            <div {...provided.droppableProps} ref={provided.innerRef}>
                                                                                {itemTasks.map((task, taskIndex) => (
                                                                                    <Draggable key={task.id} draggableId={task.id} index={taskIndex} isDragDisabled={!isEditMode}>
                                                                                        {(provided) => (
                                                                                            <SidebarItem item={{...task, _type: 'task'}} displayOrder={`${roadmapItemOrder}.${taskIndex + 1}`} provided={{...provided, draggableProps: provided.draggableProps as any, dragHandleProps: provided.dragHandleProps as any}} />
                                                                                        )}
                                                                                    </Draggable>
                                                                                ))}
                                                                                {provided.placeholder}
                                                                            </div>
                                                                        )}
                                                                    </Droppable>
                                                                )}
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                )
                                            })}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </DragDropContext>
                        </div>
                    </div>

                    {/* Timeline Content Area */}
                    <div className="relative" style={{ width: gridWidth }}>
                        {/* Header (sticky) */}
                        <div className="sticky top-0 bg-glass-light/80 backdrop-blur-2xl z-10 shadow-xl shadow-[0_4px_20px_rgba(var(--primary-rgb),0.15)]">
                            <div className="flex relative">
                                {months.map(({ date, days }, index) => {
                                    const isLastMonth = index === months.length - 1;
                                    return (
                                        <div key={date.toISOString()} className={`h-8 flex-shrink-0 border-b border-primary/20 flex items-center justify-center hover:bg-glass/60 hover:shadow-lg transition-all duration-200 ${!isLastMonth ? 'border-r border-primary/20' : ''}`} style={{ width: days * DAY_WIDTH }}>
                                            <span className="text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">{date.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="flex relative overflow-x-hidden">
                                {Array.from({ length: totalDays }).map((_, i) => {
                                    const day = addDays(startDate, i);
                                    const isLast = i === totalDays - 1;
                                    const isToday = day.toDateString() === new Date().toDateString();
                                    return (
                                        <div key={i} className={`h-8 flex-shrink-0 ${!isLast ? 'border-r border-primary/20' : ''} flex flex-col items-center justify-center hover:bg-glass/60 hover:scale-105 transition-all duration-200 ${isToday ? 'bg-primary/20 shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)] animate-pulse-glow' : ''} overflow-hidden`} style={{ width: DAY_WIDTH }}>
                                            <p className="text-xs text-text-secondary font-medium leading-none">{day.toLocaleDateString('default', { weekday: 'short' }).charAt(0)}</p>
                                            <p className={`text-xs font-bold leading-none mt-0.5 ${isToday ? 'text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)]' : 'text-text-primary'}`}>{day.getDate()}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Body with Rows and Bars */}
                        <div className="relative" style={{ height: `${visibleItemCount * 3}rem` }}>
                            {/* Background Grid Lines */}
                            <div className="absolute top-0 left-0 h-full w-full pointer-events-none z-0 flex">
                                {Array.from({ length: totalDays }).map((_, i) => {
                                    const day = addDays(startDate, i);
                                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                    const isLast = i === totalDays - 1;
                                    const isToday = day.toDateString() === new Date().toDateString();
                                    return (
                                        <div
                                            key={i}
                                            className={`h-full ${!isLast ? 'border-r border-primary/10' : ''} flex-shrink-0 ${isWeekend ? 'bg-white/5' : ''} ${isToday ? 'bg-primary/10 shadow-[inset_0_0_20px_rgba(var(--primary-rgb),0.15)]' : ''}`}
                                            style={{ width: DAY_WIDTH }}
                                        />
                                    );
                                })}
                            </div>

                            {/* Horizontal lines */}
                            {Array.from({ length: visibleItemCount }).map((_, i) => (
                                <div key={i} className="h-12 border-b border-primary/10"></div>
                            ))}
                            
                            {/* Bars */}
                            {(() => {
                                let rowIndex = -1;
                                return sortedRoadmapItems.map((roadmapItem) => {
                                    rowIndex++;
                                    const roadmapRowIndex = rowIndex;
                                    
                                    const taskRows = expandedItems.has(roadmapItem.id) 
                                        ? (tasksByRoadmapItem.get(roadmapItem.id) || []).map(task => {
                                            rowIndex++;
                                            return { item: {...task, _type: 'task' as const}, index: rowIndex };
                                          })
                                        : [];
                                    
                                    const allRows = [{ item: {...roadmapItem, _type: 'roadmap' as const}, index: roadmapRowIndex }, ...taskRows];

                                    return allRows.map(({item, index}) => {
                                        const currentItem = ephemeralItem && ephemeralItem.id === item.id ? ephemeralItem : item;
                                        const isTask = currentItem._type === 'task';
                                        const itemStartDate = isTask ? (currentItem as Task).start_date : (currentItem as RoadmapItem).startDate;
                                        const itemEndDate = isTask ? (currentItem as Task).dueDate : (currentItem as RoadmapItem).endDate;
                                        
                                        if (!itemStartDate || !itemEndDate) return null;

                                        const left = diffInDays(itemStartDate, startDate) * DAY_WIDTH;
                                        const duration = diffInDays(itemEndDate, itemStartDate) + 1;
                                        const width = duration * DAY_WIDTH - 4;
                                        const itemAssignees = users.filter(m => (currentItem as Task).assignees?.includes(m.id));
                                        
                                        const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', {month:'short', day: 'numeric'})

                                        const parentRoadmapItem = isTask ? sortedRoadmapItems.find(ri => ri.id === (currentItem as Task).roadmapItemId) : currentItem as RoadmapItem;
                                        const customPatternStyle = parentRoadmapItem?.backgroundPattern ? backgroundPatterns.find(p => p.id === parentRoadmapItem.backgroundPattern)?.style : undefined;
                                        const statusStyle = getStatusStyle(item);
                                        const barStyle = {
                                            ...statusStyle,
                                            backgroundImage: customPatternStyle?.backgroundImage || statusStyle.backgroundImage,
                                        };

                                        return (
                                            <div key={item.id}>
                                               {width > 0 && (
                                                    <div
                                                        className={`absolute h-8 rounded-lg flex items-center group z-10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-[0_0_25px_rgba(var(--primary-rgb),0.5)] hover:brightness-110 shadow-xl animate-scale-in ${isEditMode ? 'cursor-move' : 'cursor-pointer'}`}
                                                        style={{
                                                            top: `${index * 3 + 0.5}rem`,
                                                            left: left + 2,
                                                            width,
                                                            ...barStyle
                                                        }}
                                                        onMouseDown={isEditMode ? (e) => handleBarDragStart(item, 'move', e) : undefined}
                                                        onClick={() => {
                                                            if (wasDraggedRef.current) { wasDraggedRef.current = false; return; }
                                                            if (isTask) {
                                                                onTaskClick(item as Task);
                                                            } else {
                                                                onRoadmapItemClick(item as RoadmapItem);
                                                            }
                                                        }}
                                                    >
                                                        {isEditMode && <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-primary/30 rounded-l-lg z-20 transition-opacity duration-200" onMouseDown={(e) => handleBarDragStart(item, 'resize-left', e)}></div>}
                                                        <div className="flex items-center gap-2 px-2 overflow-hidden min-w-0 flex-1">
                                                            <span className="text-sm font-semibold text-background truncate min-w-0 flex-shrink">{item.title}</span>
                                                            {width > 150 && <span className="text-xs font-mono text-background/80 truncate flex-shrink-0">{formatDate(itemStartDate)} - {formatDate(itemEndDate)}</span>}
                                                            {isTask && itemAssignees.length > 0 && width > 80 && (
                                                                <div className="flex -space-x-1 flex-shrink-0">
                                                                    {itemAssignees.slice(0, 3).map(member => (
                                                                        <img key={member.id} src={member.avatarUrl} title={member.name} className="w-5 h-5 rounded-full border border-white/50" />
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {isEditMode && <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-primary/30 rounded-r-lg z-20 transition-opacity duration-200" onMouseDown={(e) => handleBarDragStart(item, 'resize-right', e)}></div>}
                                                    </div>
                                               )}
                                            </div>
                                        );
                                    });
                                });
                            })()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default TimelineView;