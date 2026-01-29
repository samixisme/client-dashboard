import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { RoadmapItem, Task } from '../types';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../utils/calendarSync';
import { KanbanViewIcon } from '../components/icons/KanbanViewIcon';
import { TimelineIcon } from '../components/icons/TimelineIcon';
import TimelineView from '../components/roadmap/TimelineView';
import TaskModal from '../components/TaskModal';
import { EditIcon } from '../components/icons/EditIcon';
import { SaveIcon } from '../components/icons/SaveIcon';
import RoadmapItemModal from '../components/roadmap/RoadmapItemModal';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import TaskCard from '../components/board/TaskCard';
import { AddIcon } from '../components/icons/AddIcon';
import { SettingsIcon } from '../components/icons/SettingsIcon';
import RoadmapItemActionsPopover from '../components/roadmap/RoadmapItemActionsPopover';
import MoveRoadmapTasksModal from '../components/roadmap/MoveRoadmapTasksModal';
import ReorderRoadmapItemsModal from '../components/roadmap/ReorderRoadmapItemsModal';
import { backgroundPatterns } from '../data/patterns';
import ViewSwitcher, { ViewOption } from '../components/board/ViewSwitcher';
import { doc, setDoc, updateDoc, deleteDoc, collection, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { slugify } from '../utils/slugify';

type ViewMode = 'kanban' | 'timeline';

const roadmapViewOptions: ViewOption[] = [
    { id: 'kanban', name: 'Kanban', Icon: KanbanViewIcon },
    { id: 'timeline', name: 'Timeline', Icon: TimelineIcon },
];

const RoadmapPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { data, forceUpdate } = useData();
    const { projects } = data;

    const [viewMode, setViewMode] = useState<ViewMode>('timeline');
    const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [overrideDates, setOverrideDates] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
    const [addingTaskTo, setAddingTaskTo] = useState<string | null>(null);
    
    // Popover & Modals State
    const [itemActionState, setItemActionState] = useState<{ anchorEl: HTMLElement | null, item: RoadmapItem | null }>({ anchorEl: null, item: null });
    const [isReorderItemsModalOpen, setIsReorderItemsModalOpen] = useState(false);
    const [moveTasksModalState, setMoveTasksModalState] = useState<{ isOpen: boolean, sourceItem: RoadmapItem | null }>({ isOpen: false, sourceItem: null });

    const project = projects.find(p => p.id === projectId);

    // Fetch override dates on component mount
    useEffect(() => {
        const fetchDurationSettings = async () => {
            if (!projectId) return;
            const docRef = doc(db, 'projects', projectId, 'roadmap_settings', 'duration');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const { startDate, endDate } = docSnap.data();
                setOverrideDates({ start: startDate, end: endDate });
            }
        };
        fetchDurationSettings();
    }, [projectId]);
    
    // Non-memoized calculations to fix update bugs
    const roadmapItems = data.roadmapItems.filter(item => item.projectId === projectId);
    const projectBoardIds = data.boards.filter(b => b.projectId === projectId).map(b => b.id);
    const projectTasks = data.tasks.filter(t => projectBoardIds.includes(t.boardId));
    
    const tasksByRoadmapItem = (() => {
        const map = new Map<string, Task[]>();
        roadmapItems.forEach(item => {
            let tasksForItem = projectTasks.filter(task => task.roadmapItemId === item.id);
            if (item.sortConfig) {
                const { key, direction } = item.sortConfig;
                tasksForItem.sort((a, b) => {
                    let valA: string | number, valB: string | number;
                    if (key === 'priority') {
                        const priorityMap = { 'Low': 0, 'Medium': 1, 'High': 2 };
                        valA = priorityMap[a.priority];
                        valB = priorityMap[b.priority];
                    } else if (key === 'dueDate' || key === 'createdAt') {
                         valA = a[key] ? new Date(a[key]!).getTime() : 0;
                         valB = b[key] ? new Date(b[key]!).getTime() : 0;
                    } else { // title
                        valA = a.title.toLowerCase();
                        valB = b.title.toLowerCase();
                    }
                    if (valA === 0) return 1; // Put tasks without date at the end
                    if (valB === 0) return -1;
                    if (valA < valB) return direction === 'asc' ? -1 : 1;
                    if (valA > valB) return direction === 'asc' ? 1 : -1;
                    return 0;
                });
            } else {
                 tasksForItem.sort((a,b) => (a.order || 0) - (b.order || 0))
            }
            map.set(item.id, tasksForItem);
        });
        return map;
    })();

    const calculatedDateRange = (() => {
        if (roadmapItems.length > 0) {
            const startDates = roadmapItems.map(i => new Date(i.startDate).getTime());
            const endDates = roadmapItems.map(i => new Date(i.endDate).getTime());
            
            const minStart = new Date(Math.min(...startDates));
            const maxEnd = new Date(Math.max(...endDates));

            return {
                start: minStart.toISOString().split('T')[0],
                end: maxEnd.toISOString().split('T')[0]
            };
        } else {
            const today = new Date();
            const oneMonthLater = new Date();
            oneMonthLater.setMonth(today.getMonth() + 1);
            return {
                start: today.toISOString().split('T')[0],
                end: oneMonthLater.toISOString().split('T')[0]
            };
        }
    })();

    const projectStartDate = overrideDates.start ?? calculatedDateRange.start;
    const projectEndDate = overrideDates.end ?? calculatedDateRange.end;

    const handleCreateItem = async () => {
        if (!projectId) return;
        const newOrder = roadmapItems.length > 0 ? Math.max(...roadmapItems.map(i => i.order || 0)) + 1 : 1;
        const newItemData: Omit<RoadmapItem, 'id'> = {
            projectId: projectId,
            title: 'New Roadmap Item',
            description: '',
            status: 'Planned',
            order: newOrder,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            attachments: [],
            labelIds: [],
        };
        const docId = `${slugify(newItemData.title)}-${Date.now()}`;
        await setDoc(doc(db, 'projects', projectId, 'roadmap', docId), newItemData);
    };
    
    const handleUpdateItem = async (updatedItem: RoadmapItem) => {
        if (!projectId) return;
        const { id, ...itemData } = updatedItem;
        await updateDoc(doc(db, 'projects', projectId, 'roadmap', id), itemData);

        if (editingItem?.id === updatedItem.id) {
            setEditingItem(null);
        }
    };
    
    const handleUpdateTask = async (updatedTask: Task) => {
        const board = data.boards.find(b => b.id === updatedTask.boardId);
        if (!project || !board) return;
        const { id, ...taskData } = updatedTask;
        await updateDoc(doc(db, 'projects', project.id, 'boards', board.id, 'tasks', id), JSON.parse(JSON.stringify(taskData)));
    };

    const handleDeleteTask = async (taskId: string) => {
        const task = data.tasks.find(t => t.id === taskId);
        const board = task ? data.boards.find(b => b.id === task.boardId) : undefined;
        if (project && board && task) {
             await deleteDoc(doc(db, 'projects', project.id, 'boards', board.id, 'tasks', taskId));
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!projectId) return;
        await deleteDoc(doc(db, 'projects', projectId, 'roadmap', itemId));
        setEditingItem(null);
    };
    
    const handleSortTasksInItem = (itemId: string, config: RoadmapItem['sortConfig']) => {
        handleUpdateItem({ ...data.roadmapItems.find(i => i.id === itemId)!, sortConfig: config });
    };

    const handleChangeItemPattern = (itemId: string, patternId?: string) => {
        handleUpdateItem({ ...data.roadmapItems.find(i => i.id === itemId)!, backgroundPattern: patternId });
    };

    const handleCopyItem = (itemId: string) => {
        // This is complex with Firestore, keep as local-only for now or implement as a cloud function
        forceUpdate();
    };

    const handleSetItemStatus = (itemId: string, status: 'Planned' | 'In Progress' | 'Completed') => {
        handleUpdateItem({ ...data.roadmapItems.find(i => i.id === itemId)!, status: status });
    };

    const handleMoveAllTasksInItem = (sourceItemId: string, destinationItemId: string) => {
        data.tasks.forEach(task => {
            if (task.roadmapItemId === sourceItemId) {
                const updatedTask = { ...task, roadmapItemId: destinationItemId === 'unassigned' ? undefined : destinationItemId };
                handleUpdateTask(updatedTask);
            }
        });
        setMoveTasksModalState({ isOpen: false, sourceItem: null });
    };

    const handleArchiveAllTasksInItem = (itemId: string) => {
        data.tasks.forEach(task => {
            if (task.roadmapItemId === itemId) {
                handleDeleteTask(task.id);
            }
        });
    };

    const handleReorderItems = (reordered: RoadmapItem[]) => {
        reordered.forEach((item, index) => {
             handleUpdateItem({ ...item, order: index + 1 });
        });
        setIsReorderItemsModalOpen(false);
    };

    const handleReorderTasks = (reordered: Task[], parentId: string) => {
        reordered.forEach((task, index) => {
            handleUpdateTask({ ...task, order: index + 1 });
        });
    };

    const handleKanbanDragEnd = (result: DropResult) => {
        const { source, destination, draggableId } = result;
    
        if (!destination) return;
    
        const task = data.tasks.find(t => t.id === draggableId);
        if (!task) return;
    
        if (source.droppableId === destination.droppableId) {
            const parentId = source.droppableId;
            const tasksForParent = (parentId === 'unassigned' 
                ? projectTasks.filter(t => !t.roadmapItemId) 
                : tasksByRoadmapItem.get(parentId) || []
            ).sort((a,b) => (a.order || 0) - (b.order || 0));
    
            const [moved] = tasksForParent.splice(source.index, 1);
            tasksForParent.splice(destination.index, 0, moved);
            handleReorderTasks(tasksForParent, parentId);
    
        } else {
            handleUpdateTask({ ...task, roadmapItemId: destination.droppableId === 'unassigned' ? undefined : destination.droppableId });
        }
    };
    
    const handleCreateTask = async (roadmapItemId: string, title: string) => {
        if (!title.trim() || !projectId) return;
        const boardIdForProject = data.boards.find(b => b.projectId === projectId)?.id;
        if (!boardIdForProject) return;
        const firstStage = data.stages.find(s => s.boardId === boardIdForProject && s.order === 1) || data.stages.find(s => s.boardId === boardIdForProject);
        if(!firstStage) return;

        const tasksInItem = tasksByRoadmapItem.get(roadmapItemId) || [];

        const newTaskData: Omit<Task, 'id'> = {
            boardId: boardIdForProject,
            stageId: firstStage.id, 
            title,
            description: '', priority: 'Medium', dateAssigned: new Date().toISOString(),
            assignees: [], labelIds: [], attachments: [], createdAt: new Date().toISOString(),
            roadmapItemId: roadmapItemId,
            order: tasksInItem.length,
        };
        const taskId = `${slugify(title)}-${Date.now()}`;
        await setDoc(doc(db, 'projects', projectId, 'boards', boardIdForProject, 'tasks', taskId), newTaskData);
        setAddingTaskTo(null);
    };

    const handleRoadmapItemClick = (item: RoadmapItem) => {
        setEditingItem(item);
    };
    
    const handleToggleEditMode = async () => {
        if (isEditMode) {
            // Save duration on exit
            if (projectId && (overrideDates.start || overrideDates.end)) {
                await setDoc(doc(db, 'projects', projectId, 'roadmap_settings', 'duration'), {
                    startDate: overrideDates.start,
                    endDate: overrideDates.end
                });
            }
        }
        setIsEditMode(e => !e);
    };
    
    const handleResetDuration = async () => {
        setOverrideDates({ start: null, end: null });
        if (projectId) {
            await deleteDoc(doc(db, 'projects', projectId, 'roadmap_settings', 'duration'));
        }
    };
    
    if (!project) return <div>Project not found</div>;

    const roadmapTitle = `${project.name} Roadmap`;

    const KanbanViewComponent = () => {
        const [newTaskTitle, setNewTaskTitle] = useState('');

        const handleAddTaskClick = (roadmapItemId: string) => {
            if(newTaskTitle.trim()){
                handleCreateTask(roadmapItemId, newTaskTitle);
                setNewTaskTitle('');
            }
        };

        const unassignedTasks = projectTasks.filter(task => !task.roadmapItemId).sort((a,b) => (a.order || 0) - (b.order || 0));
        const sortedRoadmapItems = [...roadmapItems].sort((a,b) => (a.order || 0) - (b.order || 0));

        const allColumns = [...sortedRoadmapItems, { id: 'unassigned', title: 'Unassigned Tasks' }];

        return (
            <DragDropContext onDragEnd={handleKanbanDragEnd}>
                <div className="flex gap-6 h-full w-full p-1">
                    {allColumns.map((item, index) => {
                        const isUnassignedColumn = item.id === 'unassigned';
                        const columnTasks = isUnassignedColumn ? unassignedTasks : (tasksByRoadmapItem.get(item.id) || []);
                        const pattern = !isUnassignedColumn ? (item as RoadmapItem).backgroundPattern ? backgroundPatterns.find(p => p.id === (item as RoadmapItem).backgroundPattern)?.style : {} : {};

                        return (
                            <div
                                key={item.id}
                                className="w-80 flex-shrink-0 flex flex-col bg-glass/40 backdrop-blur-xl rounded-2xl border border-border-color shadow-lg hover:shadow-xl transition-all duration-300 animate-scale-in"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="flex justify-between items-center p-4 rounded-t-2xl backdrop-blur-xl bg-white/5 border-b border-border-color/50" style={{...pattern}}>
                                    <div className="flex items-center gap-2">
                                        <h2 className="font-bold text-lg text-text-primary">{item.title}</h2>
                                        <span className="text-xs font-bold text-text-secondary bg-surface-light/70 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">{columnTasks.length}</span>
                                    </div>
                                    {!isUnassignedColumn && (
                                        <div className="flex items-center gap-2 text-text-secondary">
                                            <button onClick={() => setAddingTaskTo(item.id)} className="hover:text-text-primary p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200 hover:scale-110"><AddIcon className="h-5 w-5"/></button>
                                            <button onClick={(e) => { e.stopPropagation(); setItemActionState({ anchorEl: e.currentTarget, item: item as RoadmapItem }); }} className="hover:text-text-primary p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200 hover:scale-110"><SettingsIcon className="h-5 w-5"/></button>
                                        </div>
                                    )}
                                </div>
                                <Droppable droppableId={item.id} type="TASK">
                                    {(provided, snapshot) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className={`p-3 flex-1 flex flex-col overflow-hidden transition-all duration-200 ${snapshot.isDraggingOver ? 'bg-primary/5' : ''}`}
                                        >
                                            <div className="flex flex-col gap-3 flex-grow overflow-y-auto pr-1 custom-scrollbar">
                                                {columnTasks.length === 0 && addingTaskTo !== item.id && (
                                                    <div className="flex-1 flex items-center justify-center text-sm text-text-secondary p-6 text-center bg-glass-light/30 rounded-lg border border-dashed border-border-color">
                                                        No tasks here.
                                                    </div>
                                                )}
                                                {columnTasks.map((task, taskIndex) => (
                                                    <Draggable key={task.id} draggableId={task.id} index={taskIndex}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                onClick={() => setSelectedTask(task)}
                                                                className={`transition-all duration-200 ${snapshot.isDragging ? 'opacity-50 rotate-2' : 'hover:scale-[1.02]'}`}
                                                            >
                                                                <TaskCard task={task} />
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>

                                            {addingTaskTo === item.id && !isUnassignedColumn ? (
                                                <div className="mt-3 p-1 animate-scale-in">
                                                    <textarea
                                                        value={newTaskTitle}
                                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                                        placeholder="Enter task title..."
                                                        className="w-full p-3 text-sm rounded-lg bg-glass-light backdrop-blur-sm border border-border-color focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 shadow-sm"
                                                        rows={2} autoFocus
                                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAddTaskClick(item.id))}
                                                    />
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <button onClick={() => handleAddTaskClick(item.id)} className="px-4 py-2 bg-primary text-background font-bold text-sm rounded-lg hover:bg-primary-hover hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md">Add Task</button>
                                                        <button onClick={() => setAddingTaskTo(null)} className="text-2xl text-text-secondary hover:text-text-primary leading-none p-1 rounded-md hover:bg-glass-light transition-all duration-200">&times;</button>
                                                    </div>
                                                </div>
                                            ) : !isUnassignedColumn && (
                                                <button onClick={() => setAddingTaskTo(item.id)} className="mt-2 w-full text-left text-sm p-3 rounded-lg text-text-secondary hover:bg-glass-light hover:text-text-primary flex items-center gap-2 transition-all duration-200 border border-transparent hover:border-border-color">
                                                    <AddIcon className="h-4 w-4"/> Add Task
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        );
                    })}
                     {isEditMode && (
                        <div className="flex-shrink-0 h-full flex items-center animate-slide-in-left" style={{ animationDelay: `${allColumns.length * 100}ms` }}>
                            <button
                                onClick={handleCreateItem}
                                className="flex flex-col items-center justify-center gap-3 w-20 h-48 bg-primary hover:bg-primary-hover rounded-2xl transition-all duration-300 text-background shadow-lg hover:shadow-2xl hover:scale-105 border border-primary-hover"
                            >
                                <div className="bg-background/20 rounded-lg p-2 backdrop-blur-sm">
                                    <AddIcon className="h-6 w-6" />
                                </div>
                                <span className="font-bold text-sm [writing-mode:vertical-rl] rotate-180 tracking-wider">Add Item</span>
                            </button>
                        </div>
                     )}
                </div>
            </DragDropContext>
        );
    };

    return (
        <div className="h-full flex flex-col">
            <style>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                @keyframes slideInLeft {
                    from {
                        opacity: 0;
                        transform: translateX(-30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                @keyframes scaleIn {
                    from {
                        opacity: 0;
                        transform: scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                @keyframes pulseGlow {
                    0%, 100% {
                        box-shadow: 0 0 8px var(--primary);
                    }
                    50% {
                        box-shadow: 0 0 20px var(--primary);
                    }
                }

                @keyframes shimmer {
                    0% {
                        transform: translateX(-100%);
                    }
                    100% {
                        transform: translateX(200%);
                    }
                }

                .animate-fade-in-up {
                    animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    opacity: 0;
                }

                .animate-fade-in {
                    animation: fadeIn 0.4s ease-out forwards;
                }

                .animate-slide-in-right {
                    animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                .animate-slide-in-left {
                    animation: slideInLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    opacity: 0;
                }

                .animate-scale-in {
                    animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    opacity: 0;
                }

                .animate-pulse-glow {
                    animation: pulseGlow 2.5s ease-in-out infinite;
                }

                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }
            `}</style>

            {viewMode === 'timeline' && (
                <div className="mb-6 bg-glass/40 backdrop-blur-xl p-5 rounded-2xl border border-border-color shadow-xl flex items-center gap-4 animate-scale-in transition-all duration-500 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:border-primary/40" style={{ animationDelay: '200ms' }}>
                    <label className="text-sm font-bold text-text-secondary uppercase tracking-wider">Project Duration:</label>
                    <input
                        type="date"
                        value={projectStartDate || ''}
                        onChange={(e) => setOverrideDates(d => ({ ...d, start: e.target.value }))}
                        disabled={!isEditMode}
                        className="bg-glass backdrop-blur-xl border border-border-color rounded-xl px-4 py-2.5 text-sm text-text-primary disabled:opacity-50 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 shadow-sm focus:shadow-lg"
                    />
                    <span className="text-text-secondary font-bold">to</span>
                    <input
                        type="date"
                        value={projectEndDate || ''}
                        onChange={(e) => setOverrideDates(d => ({ ...d, end: e.target.value }))}
                        disabled={!isEditMode}
                        className="bg-glass backdrop-blur-xl border border-border-color rounded-xl px-4 py-2.5 text-sm text-text-primary disabled:opacity-50 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 shadow-sm focus:shadow-lg"
                    />
                    {(overrideDates.start || overrideDates.end) && isEditMode && (
                        <button onClick={handleResetDuration} className="text-xs font-bold text-text-secondary hover:text-primary transition-all duration-300 px-3 py-2 rounded-lg hover:bg-glass-light hover:scale-105 uppercase tracking-wider">Reset to Auto</button>
                    )}

                    {/* Edit and View Switcher Controls */}
                    <div className="ml-auto flex items-center gap-3 flex-wrap">
                        {isEditMode && (
                             <button onClick={handleCreateItem} className="px-6 py-2.5 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.5)] hover:scale-110 transition-all duration-300 shadow-lg relative overflow-hidden group/btn">
                                <span className="relative z-10 flex items-center gap-2">
                                    <svg className="w-4 h-4 group-hover/btn:rotate-90 transition-transform duration-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                    Add Roadmap
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                            </button>
                        )}
                        <button onClick={handleToggleEditMode} className={`px-5 py-2.5 text-sm font-bold rounded-xl flex items-center gap-2.5 transition-all duration-300 shadow-md hover:shadow-xl hover:scale-105 ${isEditMode ? 'bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'bg-white/5 backdrop-blur-xl text-text-primary hover:bg-white/10 border border-[rgba(163,230,53,0.1)] hover:border-primary/40'}`}>
                            {isEditMode ? <><SaveIcon className="h-4 w-4"/> Done</> : <><EditIcon className="h-4 w-4"/> Edit</>}
                        </button>
                        <ViewSwitcher currentView={viewMode} onSwitchView={(view) => setViewMode(view as ViewMode)} options={roadmapViewOptions} />
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col overflow-hidden">
                {viewMode === 'kanban' ? (
                    <div className="flex-1 overflow-x-auto pb-4 -mx-1">
                        <KanbanViewComponent />
                    </div>
                ) : projectStartDate && projectEndDate ? (
                     <TimelineView 
                        items={roadmapItems} 
                        tasks={projectTasks} 
                        onUpdateItem={handleUpdateItem} 
                        onUpdateTask={handleUpdateTask} 
                        onTaskClick={setSelectedTask} 
                        onRoadmapItemClick={handleRoadmapItemClick}
                        isEditMode={isEditMode} 
                        onReorderItems={handleReorderItems} 
                        onReorderTasks={handleReorderTasks}
                        projectStartDate={projectStartDate}
                        projectEndDate={projectEndDate}
                    />
                ) : null}
            </div>
            
            {editingItem && (
                <RoadmapItemModal
                    item={editingItem}
                    onClose={() => setEditingItem(null)}
                    onUpdateItem={handleUpdateItem}
                    onDeleteItem={handleDeleteItem}
                />
            )}
            {selectedTask && (
                <TaskModal 
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                />
            )}
            {itemActionState.anchorEl && itemActionState.item && (
                <RoadmapItemActionsPopover
                    anchorEl={itemActionState.anchorEl}
                    item={itemActionState.item}
                    onClose={() => setItemActionState({ anchorEl: null, item: null })}
                    onOpenDetails={() => {
                        setEditingItem(itemActionState.item);
                        setItemActionState({ anchorEl: null, item: null });
                    }}
                    onArchiveItem={handleDeleteItem}
                    onArchiveAllTasks={handleArchiveAllTasksInItem}
                    onCopyItem={handleCopyItem}
                    onSetStatus={handleSetItemStatus}
                    onMoveAllTasks={() => {
                        setMoveTasksModalState({isOpen: true, sourceItem: itemActionState.item});
                        setItemActionState({ anchorEl: null, item: null });
                    }}
                    onApplySort={handleSortTasksInItem}
                    onChangePattern={handleChangeItemPattern}
                     onOpenReorder={() => {
                        setIsReorderItemsModalOpen(true);
                        setItemActionState({ anchorEl: null, item: null });
                    }}
                />
            )}
             {moveTasksModalState.isOpen && moveTasksModalState.sourceItem && (
                <MoveRoadmapTasksModal
                    isOpen={moveTasksModalState.isOpen}
                    onClose={() => setMoveTasksModalState({ isOpen: false, sourceItem: null })}
                    sourceItem={moveTasksModalState.sourceItem}
                    items={roadmapItems}
                    onMove={handleMoveAllTasksInItem}
                />
            )}
            {isReorderItemsModalOpen && (
                <ReorderRoadmapItemsModal
                    isOpen={isReorderItemsModalOpen}
                    onClose={() => setIsReorderItemsModalOpen(false)}
                    items={roadmapItems.sort((a, b) => (a.order || 0) - (b.order || 0))}
                    onSaveOrder={handleReorderItems}
                />
            )}
        </div>
    );
};

export default RoadmapPage;
