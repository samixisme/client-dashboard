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

export type ViewMode = 'kanban' | 'list' | 'table' | 'calendar';

const boardViewOptions: ViewOption[] = [
    { id: 'kanban', name: 'Kanban', Icon: KanbanViewIcon },
    { id: 'list', name: 'List', Icon: ListIcon },
    { id: 'table', name: 'Table', Icon: TableViewIcon },
    { id: 'calendar', name: 'Calendar', Icon: CalendarIcon },
];

const ProjectBoardPage = () => {
    const { boardId } = useParams<{ boardId: string }>();
    const { data, forceUpdate } = useData();
    const { projects, boards, activities } = data;

    const [viewMode, setViewMode] = useState<ViewMode>('kanban');
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
    
    const handleDragEnd = (result: any) => {
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
            forceUpdate();
        }
    };
    
    const handleDeleteTask = (taskId: string) => {
        const taskIndex = data.tasks.findIndex(t => t.id === taskId);
        if(taskIndex > -1) {
            data.tasks.splice(taskIndex, 1);
            forceUpdate();
        }
    };

    const handleUpdateTask = (updatedTask: Task) => {
        const index = data.tasks.findIndex(t => t.id === updatedTask.id);
        if (index !== -1) {
            data.tasks[index] = updatedTask;
            forceUpdate();
        }
    }

    const handleAddTask = (stageId: string, title: string) => {
        if (title.trim() === '' || !boardId) return;
        const newTask: Task = {
            id: `task-${Date.now()}`, boardId, stageId, title,
            description: '', priority: 'Medium', dateAssigned: new Date().toISOString(),
            assignees: [], labelIds: [], attachments: [], createdAt: new Date().toISOString(),
        };
        data.tasks.push(newTask);
        forceUpdate();
        setAddingTaskToStage(null);
    };

    const handleAddStage = (name: string, status: 'Open' | 'Closed') => {
        if (name.trim() && boardId) {
            const newStage: Stage = {
                id: `stage-${Date.now()}`,
                boardId,
                name,
                status,
                order: data.stages.filter(s => s.boardId === boardId).length + 1,
            };
            data.stages.push(newStage);
            forceUpdate();
        }
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
    
    const handleSetStageStatus = (stageId: string, status: 'Open' | 'Closed') => {
        const stage = data.stages.find(s => s.id === stageId);
        if (stage) {
            stage.status = status;
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
        setMoveTasksModalState({ isOpen: false, sourceStage: null });
    };

    const handleArchiveStage = (stageId: string) => {
        data.tasks = data.tasks.filter(t => t.stageId !== stageId);
        const stageIndex = data.stages.findIndex(s => s.id === stageId);
        if (stageIndex > -1) {
            data.stages.splice(stageIndex, 1);
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
        if (stage) {
            stage.sortConfig = config;
            forceUpdate();
        }
        setStageActionState({ anchorEl: null, stage: null });
    };
    
    const handleChangeStagePattern = (stageId: string, patternId?: string) => {
        const stage = data.stages.find(s => s.id === stageId);
        if (stage) {
            stage.backgroundPattern = patternId;
            forceUpdate();
        }
        setStageActionState({ anchorEl: null, stage: null });
    };

    const handleReorderStages = (reorderedStages: Stage[]) => {
        reorderedStages.forEach((stage, index) => {
            const originalStage = data.stages.find(s => s.id === stage.id);
            if (originalStage) {
                originalStage.order = index;
            }
        });
        forceUpdate();
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
            {/* Header Toolbar */}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">{board.name}</h1>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {isMobile && viewMode === 'kanban' && (
                         <button 
                            onClick={() => setIsAddStageModalOpen(true)}
                            className="px-3 py-2 flex items-center gap-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover"
                        >
                            <AddIcon className="h-4 w-4" /> Add Stage
                        </button>
                    )}
                    <ViewSwitcher currentView={viewMode} onSwitchView={(view) => setViewMode(view as ViewMode)} options={boardViewOptions} />
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
                            className="flex flex-col items-center justify-center gap-2 w-16 h-40 bg-primary hover:bg-primary-hover rounded-lg transition-colors text-background"
                        >
                            <div className="bg-background/20 rounded p-1.5">
                                <AddIcon className="h-5 w-5" />
                            </div>
                            <span className="font-semibold text-sm [writing-mode:vertical-rl] rotate-180 tracking-wider">Add Stage</span>
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