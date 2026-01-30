import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Stage, Task } from '../../../types';
import { AddIcon } from '../../icons/AddIcon';
import { SettingsIcon } from '../../icons/SettingsIcon';
import TaskCard from '../TaskCard';
import { backgroundPatterns } from '../../../data/patterns';

interface KanbanViewProps {
    boardId: string;
    onDragEnd: (result: DropResult) => void;
    onTaskClick: (task: Task) => void;
    onOpenStageActions: (anchorEl: HTMLElement, stage: Stage) => void;
    stages: Stage[];
    tasksByStage: Map<string, Task[]>;
    addingToStage: string | null;
    setAddingToStage: (stageId: string | null) => void;
    onAddTask: (stageId: string, title: string) => void;
}

const KanbanView: React.FC<KanbanViewProps> = ({ 
    boardId, onDragEnd, onTaskClick, onOpenStageActions, stages, tasksByStage, 
    addingToStage, setAddingToStage, onAddTask 
}) => {
    const [newTaskTitle, setNewTaskTitle] = useState('');

    const handleAddTaskClick = (stageId: string) => {
        if(newTaskTitle.trim()){
            onAddTask(stageId, newTaskTitle);
            setNewTaskTitle('');
        }
    };

    return (
        <div className="flex gap-6 h-full w-full">
            <DragDropContext onDragEnd={onDragEnd}>
                {stages.map(stage => {
                    const stageTasks = tasksByStage.get(stage.id) || [];
                    const pattern = stage.backgroundPattern ? backgroundPatterns.find(p => p.id === stage.backgroundPattern)?.style : {};
                    return (
                        <div key={stage.id} className="w-80 flex-shrink-0 flex flex-col bg-glass/40 backdrop-blur-xl rounded-xl border border-border-color shadow-xl">
                            <div className="flex justify-between items-center p-3 rounded-t-xl" style={{...pattern}}>
                                <div className="flex items-center gap-2">
                                    <h2 className="font-semibold text-text-primary">{stage.name}</h2>
                                    <span className="text-sm font-medium text-text-secondary bg-surface-light/50 px-2 py-0.5 rounded-md">{stageTasks.length}</span>
                                </div>
                                <div className="flex items-center gap-2 text-text-secondary">
                                    <button onClick={() => setAddingToStage(stage.id)} className="hover:text-primary hover:bg-glass-light/60 hover:scale-110 transition-all duration-300 p-1 rounded-lg hover:shadow-lg"><AddIcon className="h-5 w-5"/></button>
                                    <button onClick={(e) => onOpenStageActions(e.currentTarget, stage)} className="hover:text-primary hover:bg-glass-light/60 hover:scale-110 transition-all duration-300 p-1 rounded-lg hover:shadow-lg"><SettingsIcon className="h-5 w-5"/></button>
                                </div>
                            </div>
                            <Droppable droppableId={stage.id}>
                                {(provided) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className="p-2 flex-1 flex flex-col overflow-visible"
                                    >
                                        <div className="flex flex-col gap-3 flex-grow overflow-y-auto overflow-x-visible pr-1 pb-2">
                                            {stageTasks.length === 0 && addingToStage !== stage.id && (
                                                <div className="flex-1 flex items-center justify-center text-sm text-text-secondary">
                                                    No tasks in this stage.
                                                </div>
                                            )}
                                            {stageTasks.map((task, index) => (
                                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                                    {(provided) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            onClick={() => onTaskClick(task)}
                                                        >
                                                            <TaskCard task={task} />
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                        
                                        {addingToStage === stage.id ? (
                                            <div className="mt-3 p-1">
                                                <textarea
                                                    value={newTaskTitle}
                                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                                    placeholder="Enter task title..."
                                                    className="w-full p-2 text-sm rounded-xl bg-surface-light backdrop-blur-sm border border-border-color focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 shadow-sm focus:shadow-lg"
                                                    rows={2} autoFocus
                                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAddTaskClick(stage.id))}
                                                />
                                                <div className="flex items-center gap-2 mt-2">
                                                    <button onClick={() => handleAddTaskClick(stage.id)} className="px-3 py-1.5 bg-primary text-background font-bold text-sm rounded-xl hover:bg-primary-hover hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.5)] hover:scale-110 transition-all duration-300 shadow-lg relative overflow-hidden group">
                                                        <span className="relative z-10">Add Task</span>
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                                    </button>
                                                    <button onClick={() => setAddingToStage(null)} className="text-xl text-text-secondary hover:text-text-primary leading-none hover:scale-110 transition-all duration-300">&times;</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button onClick={() => setAddingToStage(stage.id)} className="mt-2 w-full text-left text-sm p-2 rounded-lg text-text-secondary hover:bg-glass-light/60 hover:text-primary hover:scale-105 transition-all duration-300 flex items-center gap-2">
                                                <AddIcon className="h-4 w-4"/> Add Task
                                            </button>
                                        )}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    )
                })}
            </DragDropContext>
        </div>
    );
};

export default KanbanView;