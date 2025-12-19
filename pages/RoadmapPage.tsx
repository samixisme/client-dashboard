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
        const docId = slugify(newItemData.title);
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
                    {allColumns.map(item => {
                        const isUnassignedColumn = item.id === 'unassigned';
                        const columnTasks = isUnassignedColumn ? unassignedTasks : (tasksByRoadmapItem.get(item.id) || []);
                        const pattern = !isUnassignedColumn ? (item as RoadmapItem).backgroundPattern ? backgroundPatterns.find(p => p.id === (item as RoadmapItem).backgroundPattern)?.style : {} : {};
    
                        return (
                            <div key={item.id} className="w-80 flex-shrink-0 flex flex-col bg-surface rounded-xl border border-border-color">
                                <div className="flex justify-between items-center p-3 rounded-t-xl" style={{...pattern}}>
                                    <div className="flex items-center gap-2">
                                        <h2 className="font-semibold text-text-primary">{item.title}</h2>
                                        <span className="text-sm font-medium text-text-secondary bg-surface-light/50 px-2 py-0.5 rounded-md">{columnTasks.length}</span>
                                    </div>
                                    {!isUnassignedColumn && (
                                        <div className="flex items-center gap-2 text-text-secondary">
                                            <button onClick={() => setAddingTaskTo(item.id)} className="hover:text-text-primary p-1 rounded-md hover:bg-white/10"><AddIcon className="h-5 w-5"/></button>
                                            <button onClick={(e) => { e.stopPropagation(); setItemActionState({ anchorEl: e.currentTarget, item: item as RoadmapItem }); }} className="hover:text-text-primary p-1 rounded-md hover:bg-white/10"><SettingsIcon className="h-5 w-5"/></button>
                                        </div>
                                    )}
                                </div>
                                <Droppable droppableId={item.id} type="TASK">
                                    {(provided) => (
                                        <div 
                                            {...provided.droppableProps} 
                                            ref={provided.innerRef}
                                            className="p-2 flex-1 flex flex-col overflow-hidden"
                                        >
                                            <div className="flex flex-col gap-3 flex-grow overflow-y-auto pr-1">
                                                {columnTasks.length === 0 && addingTaskTo !== item.id && (
                                                    <div className="flex-1 flex items-center justify-center text-sm text-text-secondary p-4 text-center">
                                                        No tasks here.
                                                    </div>
                                                )}
                                                {columnTasks.map((task, index) => (
                                                    <Draggable key={task.id} draggableId={task.id} index={index}>
                                                        {(provided) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                onClick={() => setSelectedTask(task)}
                                                            >
                                                                <TaskCard task={task} />
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                            
                                            {addingTaskTo === item.id && !isUnassignedColumn ? (
                                                <div className="mt-3 p-1">
                                                    <textarea
                                                        value={newTaskTitle}
                                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                                        placeholder="Enter task title..."
                                                        className="w-full p-2 text-sm rounded-lg bg-surface-light border border-border-color focus:ring-primary focus:border-primary"
                                                        rows={2} autoFocus
                                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAddTaskClick(item.id))}
                                                    />
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <button onClick={() => handleAddTaskClick(item.id)} className="px-3 py-1 bg-primary text-background font-bold text-sm rounded-lg hover:bg-primary-hover">Add Task</button>
                                                        <button onClick={() => setAddingTaskTo(null)} className="text-xl text-text-secondary hover:text-text-primary leading-none">&times;</button>
                                                    </div>
                                                </div>
                                            ) : !isUnassignedColumn && (
                                                <button onClick={() => setAddingTaskTo(item.id)} className="mt-2 w-full text-left text-sm p-2 rounded-lg text-text-secondary hover:bg-surface-light hover:text-text-primary flex items-center gap-2">
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
                        <div className="flex-shrink-0 h-full flex items-center">
                            <button 
                                onClick={handleCreateItem}
                                className="flex flex-col items-center justify-center gap-2 w-16 h-40 bg-primary hover:bg-primary-hover rounded-lg transition-colors text-background"
                            >
                                <div className="bg-background/20 rounded p-1.5">
                                    <AddIcon className="h-5 w-5" />
                                </div>
                                <span className="font-semibold text-sm [writing-mode:vertical-rl] rotate-180 tracking-wider">Add Item</span>
                            </button>
                        </div>
                     )}
                </div>
            </DragDropContext>
        );
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary mt-1">{roadmapTitle}</h1>
                    <p className="mt-2 text-text-secondary">{project.description}</p>
                </div>
                 <div className="flex items-center gap-2">
                    {isEditMode && (
                         <button onClick={handleCreateItem} className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover">
                            + Add Roadmap
                        </button>
                    )}
                    <button onClick={handleToggleEditMode} className={`px-4 py-2 text-sm font-bold rounded-lg flex items-center gap-2 transition-colors ${isEditMode ? 'bg-green-500 text-white' : 'bg-glass-light text-text-primary hover:bg-border-color'}`}>
                        {isEditMode ? <><SaveIcon className="h-4 w-4"/> Done</> : <><EditIcon className="h-4 w-4"/> Edit</>}
                    </button>
                    <ViewSwitcher currentView={viewMode} onSwitchView={(view) => setViewMode(view as ViewMode)} options={roadmapViewOptions} />
                </div>
            </div>

            {viewMode === 'timeline' && (
                <div className="mb-4 bg-glass p-3 rounded-lg border border-border-color flex items-center gap-4">
                    <label className="text-sm font-medium text-text-secondary">Project Duration:</label>
                    <input 
                        type="date" 
                        value={projectStartDate || ''} 
                        onChange={(e) => setOverrideDates(d => ({ ...d, start: e.target.value }))} 
                        disabled={!isEditMode}
                        className="bg-glass-light border border-border-color rounded-md px-2 py-1 text-sm text-text-primary disabled:opacity-50" 
                    />
                    <span className="text-text-secondary">to</span>
                    <input 
                        type="date" 
                        value={projectEndDate || ''} 
                        onChange={(e) => setOverrideDates(d => ({ ...d, end: e.target.value }))}
                        disabled={!isEditMode}
                        className="bg-glass-light border border-border-color rounded-md px-2 py-1 text-sm text-text-primary disabled:opacity-50" 
                    />
                    {(overrideDates.start || overrideDates.end) && isEditMode && (
                        <button onClick={handleResetDuration} className="text-xs text-text-secondary hover:text-primary">Reset to Auto</button>
                    )}
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
