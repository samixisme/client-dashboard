import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Stage, Task } from '../types';
import TaskModal from '../components/TaskModal';
import { useData } from '../contexts/DataContext';

import { AddIcon } from '../components/icons/AddIcon';

import KanbanView from '../components/board/views/KanbanView';
import ListView from '../components/board/views/ListView';
import TableView from '../components/board/views/TableView';
import ProjectCalendarView from '../components/board/ProjectCalendarView';
import ViewSwitcher, { ViewOption } from '../components/board/ViewSwitcher';
import AddStageModal from '../components/board/AddStageModal';
import StageActionsPopover from '../components/board/StageActionsPopover';
import MoveTasksModal from '../components/board/MoveTasksModal';
import ReorderStagesModal from '../components/board/ReorderStagesModal';
import { KanbanViewIcon } from '../components/icons/KanbanViewIcon';
import { ListIcon } from '../components/icons/ListIcon';
import { TableViewIcon } from '../components/icons/TableViewIcon';
import { CalendarIcon } from '../components/icons/CalendarIcon';
import { doc, addDoc, updateDoc, deleteDoc, collection, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { slugify } from '../utils/slugify';
import { deleteStageDeep, deleteTaskDeep } from '../utils/dataCleanup';
import { toast } from 'sonner';

export type ViewMode = 'kanban' | 'list' | 'table' | 'calendar';

const boardViewOptions: ViewOption[] = [
    { id: 'kanban', name: 'Kanban', Icon: KanbanViewIcon },
    { id: 'list', name: 'List', Icon: ListIcon },
    { id: 'table', name: 'Table', Icon: TableViewIcon },
    { id: 'calendar', name: 'Calendar', Icon: CalendarIcon },
];

const ProjectBoardPage = () => {
    // Animation styles
    const animationStyles = `
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

        @keyframes pulse-glow {
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

        .animate-pulse-glow {
            animation: pulse-glow 2.5s ease-in-out infinite;
        }

        .animate-shimmer {
            animation: shimmer 2s infinite;
        }

        .animate-scale-in {
            animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
    `;

    const { boardId } = useParams<{ boardId: string }>();
    const { data, forceUpdate } = useData();
    const { projects, boards, activities } = data;

    const [viewMode, setViewMode] = useState<ViewMode>('kanban');

    // View switching handler (must be declared AFTER viewMode state)
    const handleViewSwitch = useCallback((view: string) => {
        if (view === 'kanban' || view === 'list' || view === 'table' || view === 'calendar') {
            setViewMode(view as ViewMode);
        }
    }, []);

    const [board, setBoard] = useState(boards.find(b => b.id === boardId));
    const [project, setProject] = useState(board ? projects.find(p => p.id === board.projectId) : undefined);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    
    // Modals & Popovers State
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isAddStageModalOpen, setIsAddStageModalOpen] = useState(false);
    const [stageActionState, setStageActionState] = useState<{ anchorEl: HTMLElement | null, stage: Stage | null }>({ anchorEl: null, stage: null });
    const [moveTasksModalState, setMoveTasksModalState] = useState<{ isOpen: boolean, sourceStage: Stage | null }>({ isOpen: false, sourceStage: null });
    const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
    const [addingTaskToStage, setAddingTaskToStage] = useState<string | null>(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (boardId) {
            const currentBoard = data.boards.find(b => b.id === boardId);
            setBoard(currentBoard);
            if (currentBoard) {
                setProject(data.projects.find(p => p.id === currentBoard.projectId));
            }
        }
    }, [boardId, data.boards, data.projects]);

    const { boardStages, tasksByStage } = (() => {
        if (!boardId) return { boardStages: [], tasksByStage: new Map() };

        const stages = data.stages
            .filter(s => s.boardId === boardId)
            .sort((a, b) => a.order - b.order);

        const tasksMap = new Map<string, Task[]>();
        stages.forEach(stage => {
            let tasks = data.tasks.filter(t => t.stageId === stage.id);
            if (stage.sortConfig) {
                const { key, direction } = stage.sortConfig;
                tasks.sort((a, b) => {
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
            }
            tasksMap.set(stage.id, tasks);
        });

        return { boardStages: stages, tasksByStage: tasksMap };

    })();
    
    const handleDragEnd = async (result: any) => {
        const { destination, source, draggableId } = result;

        if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
            return;
        }

        const taskToMove = data.tasks.find(t => t.id === draggableId);
        if (taskToMove && source.droppableId !== destination.droppableId) {
            taskToMove.stageId = destination.droppableId;
            
            const sourceStage = data.stages.find(s => s.id === source.droppableId);
            const destStage = data.stages.find(s => s.id === destination.droppableId);

            const newActivity = {
                id: `activity-${Date.now()}`,
                objectId: draggableId,
                objectType: 'task' as const,
                description: `User moved task "${taskToMove.title}" from ${sourceStage?.name} to ${destStage?.name}.`,
                timestamp: new Date().toISOString()
            };
            activities.push(newActivity);
            
            // Update Firestore
            if (project && boardId && !taskToMove.id.startsWith('task-')) {
                try {
                    // Assuming path: projects/{projectId}/boards/{boardId}/tasks/{taskId}
                    // Note: We are moving to a new stage, but stageId is just a field in the task document.
                    // We do NOT move the document to a different collection.
                    await updateDoc(doc(db, 'projects', project.id, 'boards', boardId, 'tasks', taskToMove.id), {
                        stageId: destination.droppableId
                    });
                } catch (e) {
                    console.error("Error updating task stage in Firestore", e);
                }
            }

            forceUpdate();
        }
    };
    
    const handleDeleteTask = async (taskId: string) => {
        const taskToDelete = data.tasks.find(t => t.id === taskId);
        
        // Optimistic update
        const taskIndex = data.tasks.findIndex(t => t.id === taskId);
        if(taskIndex > -1) {
            data.tasks.splice(taskIndex, 1);
            forceUpdate();
        }

        if (project && boardId && taskToDelete && !taskId.startsWith('task-')) {
            try {
                // Use Deep Delete to remove subcollections (comments, logs)
                await deleteTaskDeep(project.id, boardId, taskId);
            } catch (e) {
                console.error("Error deleting task from Firestore", e);
            }
        }
    };

    const handleUpdateTask = async (updatedTask: Task) => {
        // Optimistic update
        const index = data.tasks.findIndex(t => t.id === updatedTask.id);
        if (index !== -1) {
            data.tasks[index] = updatedTask;
            forceUpdate();
        }

        if (project && boardId && !updatedTask.id.startsWith('task-')) {
            try {
                // We need to strip out fields that might not be in Firestore or are handled differently if needed
                // But generally dumping the object is fine if it matches schema.
                // Removing undefined values is good practice as Firestore doesn't like them.
                const taskData = JSON.parse(JSON.stringify(updatedTask)); 
                await updateDoc(doc(db, 'projects', project.id, 'boards', boardId, 'tasks', updatedTask.id), taskData);
            } catch (e) {
                console.error("Error updating task in Firestore", e);
            }
        }
    };

    const handleAddTask = async (stageId: string, title: string) => {
        if (title.trim() === '' || !boardId || !project) return;
        
        const newTaskData: Omit<Task, 'id'> = {
            boardId, 
            stageId, 
            title,
            description: '', 
            priority: 'Medium', 
            dateAssigned: new Date().toISOString(),
            assignees: [], 
            labelIds: [], 
            attachments: [], 
            createdAt: new Date().toISOString(),
        };

        // Use slugified title + timestamp for ID
        const taskSlug = slugify(title);
        const taskId = `${taskSlug}-${Date.now()}`;

        try {
            await setDoc(doc(db, 'projects', project.id, 'boards', boardId, 'tasks', taskId), newTaskData);
            // No need to manually push to data.tasks as DataContext listener will pick it up
        } catch (e) {
            console.error("Error adding task to Firestore", e);
            // Fallback
            const newTask: Task = {
                id: `task-${Date.now()}`,
                ...newTaskData
            };
            data.tasks.push(newTask);
            forceUpdate();
        }
        
        setAddingTaskToStage(null);
    };

    const handleAddStage = async (name: string, status: 'Open' | 'Closed') => {
        if (name.trim() && boardId && project) {
            const newStageData = {
                boardId,
                name,
                status,
                order: data.stages.filter(s => s.boardId === boardId).length + 1,
            };
            
            try {
                const stageSlug = slugify(name);
                const stageDocId = stageSlug;
                await setDoc(doc(db, 'projects', project.id, 'boards', boardId, 'stages', stageDocId), newStageData);
            } catch (e) {
                const newStage: Stage = {
                    id: `stage-${Date.now()}`,
                    ...newStageData
                } as Stage;
                data.stages.push(newStage);
                forceUpdate();
            }
        }
        toast.success('Stage created');
        setIsAddStageModalOpen(false);
    };
    
    const handleCopyStage = (stageId: string) => {
        const stageToCopy = data.stages.find(s => s.id === stageId);
        if (!stageToCopy) return;

        const newStageId = `stage-${Date.now()}`;
        const newStage: Stage = {
            ...stageToCopy,
            id: newStageId,
            name: `${stageToCopy.name} (Copy)`,
            order: data.stages.filter(s => s.boardId === boardId).length + 1,
        };
        data.stages.push(newStage);

        const tasksToCopy = data.tasks.filter(t => t.stageId === stageId);
        const newTasks: Task[] = tasksToCopy.map(task => ({
            ...task,
            id: `task-${Date.now()}-${Math.random()}`,
            stageId: newStageId,
        }));
        data.tasks.push(...newTasks);

        forceUpdate();
        setStageActionState({ anchorEl: null, stage: null });
    };
    
    const handleSetStageStatus = async (stageId: string, status: 'Open' | 'Closed') => {
        const stage = data.stages.find(s => s.id === stageId);
        if (stage && project) {
            stage.status = status;
            try {
                 await updateDoc(doc(db, 'projects', project.id, 'boards', boardId!, 'stages', stageId), { status });
            } catch (e) {
            }
            forceUpdate();
        }
        setStageActionState({ anchorEl: null, stage: null });
    };

    const handleMoveAllTasks = (sourceStageId: string, destinationStageId: string) => {
        data.tasks.forEach(task => {
            if (task.stageId === sourceStageId) {
                task.stageId = destinationStageId;
            }
        });
        forceUpdate();
        toast.success('Tasks moved successfully');
        setMoveTasksModalState({ isOpen: false, sourceStage: null });
    };

    const handleArchiveStage = async (stageId: string) => {
        data.tasks = data.tasks.filter(t => t.stageId !== stageId);
        const stageIndex = data.stages.findIndex(s => s.id === stageId);
        if (stageIndex > -1) {
            data.stages.splice(stageIndex, 1);
        }
        
        if (project && boardId) {
             try {
                await deleteDoc(doc(db, 'projects', project.id, 'boards', boardId, 'stages', stageId));
            } catch (e) {}
        }

        forceUpdate();
        setStageActionState({ anchorEl: null, stage: null });
    };

    const handleArchiveAllTasks = (stageId: string) => {
        data.tasks = data.tasks.filter(t => t.stageId !== stageId);
        forceUpdate();
        setStageActionState({ anchorEl: null, stage: null });
    };
    
    const handleSortTasks = (stageId: string, config: Stage['sortConfig']) => {
        const stage = data.stages.find(s => s.id === stageId);
        if (stage && project && boardId) {
            stage.sortConfig = config;
             try {
                updateDoc(doc(db, 'projects', project.id, 'boards', boardId, 'stages', stageId), { sortConfig: config });
            } catch (e) {}
            forceUpdate();
        }
        setStageActionState({ anchorEl: null, stage: null });
    };
    
    const handleChangeStagePattern = (stageId: string, patternId?: string) => {
        const stage = data.stages.find(s => s.id === stageId);
        if (stage && project && boardId) {
            stage.backgroundPattern = patternId;
             try {
                updateDoc(doc(db, 'projects', project.id, 'boards', boardId, 'stages', stageId), { backgroundPattern: patternId });
            } catch (e) {}
            forceUpdate();
        }
        setStageActionState({ anchorEl: null, stage: null });
    };

    const handleReorderStages = (reorderedStages: Stage[]) => {
        reorderedStages.forEach(async (stage, index) => {
            const originalStage = data.stages.find(s => s.id === stage.id);
            if (originalStage) {
                originalStage.order = index;
                if (project && boardId) {
                    try {
                         await updateDoc(doc(db, 'projects', project.id, 'boards', boardId, 'stages', stage.id), { order: index });
                    } catch(e) {}
                }
            }
        });
        forceUpdate();
        toast.success('Stage order updated');
        setIsReorderModalOpen(false);
    };

    const renderView = () => {
        switch (viewMode) {
            case 'list':
                return <ListView 
                    boardId={boardId!} 
                    onTaskClick={setSelectedTask}
                    stages={boardStages}
                    tasksByStage={tasksByStage}
                    addingToStage={addingTaskToStage}
                    setAddingToStage={setAddingTaskToStage}
                    onAddTask={handleAddTask}
                />;
            case 'table':
                return <TableView boardId={boardId!} onTaskClick={setSelectedTask} />;
            case 'calendar':
                return <ProjectCalendarView projectId={project!.id} onEventClick={setSelectedTask} />;
            case 'kanban':
            default:
                return <KanbanView 
                    boardId={boardId!}
                    onDragEnd={handleDragEnd}
                    onTaskClick={setSelectedTask}
                    onOpenStageActions={(anchor, stage) => setStageActionState({ anchorEl: anchor, stage })}
                    stages={boardStages}
                    tasksByStage={tasksByStage}
                    addingToStage={addingTaskToStage}
                    setAddingToStage={setAddingTaskToStage}
                    onAddTask={handleAddTask}
                />;
        }
    };

    if (!board || !project) return <div>Board not found</div>;

    return (
        <div className="h-full flex flex-col">
            <style>{animationStyles}</style>

            {/* Header Toolbar */}
            <div className="flex justify-end items-center mb-8 flex-wrap gap-4 animate-fade-in relative z-50">
                <div className="flex items-center gap-3 flex-wrap animate-slide-in-right">
                    {isMobile && viewMode === 'kanban' && (
                         <button
                            onClick={() => setIsAddStageModalOpen(true)}
                            className="px-4 py-2.5 flex items-center gap-2 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.5)] hover:scale-110 transition-all duration-300 shadow-lg relative overflow-hidden group/btn"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <AddIcon className="h-4 w-4 group-hover/btn:rotate-90 transition-transform duration-300" />
                                Add Stage
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                        </button>
                    )}
                    <ViewSwitcher currentView={viewMode} onSwitchView={handleViewSwitch} options={boardViewOptions} />
                </div>
            </div>

            {/* Board */}
            <div className="flex-1 flex items-start gap-6 overflow-hidden relative">
                <div className="flex-1 flex h-full overflow-auto pb-4">
                    {renderView()}
                </div>
                {!isMobile && viewMode === 'kanban' && (
                    <div className="flex-shrink-0 pl-4 h-full flex items-center">
                        <button
                            onClick={() => setIsAddStageModalOpen(true)}
                            className="flex flex-col items-center justify-center gap-2 w-16 h-40 bg-primary hover:bg-primary-hover rounded-xl hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.5)] hover:scale-105 transition-all duration-300 shadow-lg text-background relative overflow-hidden group/stage-btn"
                        >
                            <div className="bg-background/20 rounded p-1.5 relative z-10">
                                <AddIcon className="h-5 w-5 group-hover/stage-btn:rotate-90 transition-transform duration-300" />
                            </div>
                            <span className="font-semibold text-sm [writing-mode:vertical-rl] rotate-180 tracking-wider relative z-10">Add Stage</span>
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent -translate-y-full group-hover/stage-btn:translate-y-full transition-transform duration-1000" />
                        </button>
                    </div>
                )}
            </div>

            {/* Modals & Popovers */}
            {selectedTask && (
                <TaskModal 
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                />
            )}
            {isAddStageModalOpen && (
                <AddStageModal
                    isOpen={isAddStageModalOpen}
                    onClose={() => setIsAddStageModalOpen(false)}
                    onAddStage={handleAddStage}
                />
            )}
            {stageActionState.anchorEl && stageActionState.stage && (
                <StageActionsPopover
                    anchorEl={stageActionState.anchorEl}
                    stage={stageActionState.stage}
                    onClose={() => setStageActionState({ anchorEl: null, stage: null })}
                    onArchiveStage={handleArchiveStage}
                    onArchiveAllTasks={handleArchiveAllTasks}
                    onCopyStage={handleCopyStage}
                    onSetStatus={handleSetStageStatus}
                    onMoveAllTasks={() => {
                        setMoveTasksModalState({isOpen: true, sourceStage: stageActionState.stage});
                        setStageActionState({ anchorEl: null, stage: null });
                    }}
                    onApplySort={handleSortTasks}
                    onChangePattern={handleChangeStagePattern}
                     onOpenReorder={() => {
                        setIsReorderModalOpen(true);
                        setStageActionState({ anchorEl: null, stage: null });
                    }}
                />
            )}
            {moveTasksModalState.isOpen && moveTasksModalState.sourceStage && (
                <MoveTasksModal
                    isOpen={moveTasksModalState.isOpen}
                    onClose={() => setMoveTasksModalState({ isOpen: false, sourceStage: null })}
                    sourceStage={moveTasksModalState.sourceStage}
                    stages={data.stages.filter(s => s.boardId === boardId)}
                    onMove={handleMoveAllTasks}
                />
            )}
            {isReorderModalOpen && (
                <ReorderStagesModal
                    isOpen={isReorderModalOpen}
                    onClose={() => setIsReorderModalOpen(false)}
                    stages={boardStages}
                    onSaveOrder={handleReorderStages}
                />
            )}
        </div>
    );
};

export default ProjectBoardPage;