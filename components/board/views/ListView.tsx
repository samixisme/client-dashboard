import React, { useState } from 'react';
import { useData } from '../../../contexts/DataContext';
import { Task, Stage } from '../../../types';
import { AddIcon } from '../../icons/AddIcon';
import { backgroundPatterns } from '../../../data/patterns';

interface ListViewProps {
    boardId: string;
    onTaskClick: (task: Task) => void;
    stages: Stage[];
    tasksByStage: Map<string, Task[]>;
    addingToStage: string | null;
    setAddingToStage: (stageId: string | null) => void;
    onAddTask: (stageId: string, title: string) => void;
}

const PriorityBox: React.FC<{ priority: Task['priority'] }> = ({ priority }) => {
    const priorityClasses = {
        High: 'bg-red-500/20 text-red-400',
        Medium: 'bg-yellow-500/20 text-yellow-400',
        Low: 'bg-green-500/20 text-green-400',
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded ${priorityClasses[priority]}`}>{priority}</span>;
}


const ListView: React.FC<ListViewProps> = ({ 
    boardId, onTaskClick, stages, tasksByStage,
    addingToStage, setAddingToStage, onAddTask
 }) => {
    const { data } = useData();
    const [newTaskTitle, setNewTaskTitle] = useState('');

    const handleAddTaskClick = (stageId: string) => {
        if(newTaskTitle.trim()){
            onAddTask(stageId, newTaskTitle);
            setNewTaskTitle('');
        }
    };

    return (
        <div className="w-full bg-glass p-4 rounded-xl border border-border-color">
            {stages.map(stage => {
                const stageTasks = tasksByStage.get(stage.id) || [];
                // FIX: Use backgroundPattern instead of non-existent backgroundColor property.
                const pattern = stage.backgroundPattern ? backgroundPatterns.find(p => p.id === stage.backgroundPattern)?.style : {};
                return (
                    <div key={stage.id} className="mb-6 last:mb-0">
                        <h3 className="font-semibold text-text-primary mb-2 px-2" style={pattern}>{stage.name} ({stageTasks.length})</h3>
                        <div className="divide-y divide-border-color">
                            {stageTasks.map(task => {
                                const assignees = data.board_members.filter(m => task.assignees.includes(m.id));
                                const taskTags = data.tags.filter(t => task.labelIds.includes(t.id));
                                return (
                                    <div key={task.id} onClick={() => onTaskClick(task)} className="p-3 hover:bg-surface-light cursor-pointer rounded-lg grid grid-cols-12 gap-4 items-center">
                                        <div className="col-span-12 sm:col-span-5 flex items-center gap-2">
                                            <p className="font-medium text-text-primary">{task.title}</p>
                                            <div className="flex items-center gap-1">
                                                {taskTags.map(tag => (
                                                    <span key={tag.id} className="px-1.5 py-0.5 text-xs font-semibold rounded" style={{ backgroundColor: `${tag.color}40`, color: tag.color }}>{tag.name}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="col-span-6 sm:col-span-2">
                                            <PriorityBox priority={task.priority} />
                                        </div>
                                        <div className="col-span-6 sm:col-span-3">
                                            {task.dueDate && <p className="text-sm text-text-secondary">{new Date(task.dueDate).toLocaleDateString()}</p>}
                                        </div>
                                        <div className="col-span-12 sm:col-span-2 flex justify-end">
                                            <div className="flex -space-x-2">
                                                {assignees.map(member => (
                                                    <img key={member.id} src={member.avatarUrl} alt={member.name} title={member.name} className="w-8 h-8 rounded-full border-2 border-surface" />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {addingToStage === stage.id ? (
                            <div className="mt-2 p-2">
                                <textarea
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    placeholder="Enter task title..."
                                    className="w-full p-2 text-sm rounded-lg bg-surface-light border border-border-color focus:ring-primary focus:border-primary"
                                    rows={2} autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAddTaskClick(stage.id))}
                                />
                                <div className="flex items-center gap-2 mt-2">
                                    <button onClick={() => handleAddTaskClick(stage.id)} className="px-3 py-1 bg-primary text-background font-bold text-sm rounded-lg hover:bg-primary-hover">Add Task</button>
                                    <button onClick={() => setAddingToStage(null)} className="text-xl text-text-secondary hover:text-text-primary leading-none">&times;</button>
                                </div>
                            </div>
                        ) : (
                             <button onClick={() => setAddingToStage(stage.id)} className="mt-2 w-full text-left text-sm p-2 rounded-lg text-text-secondary hover:bg-surface-light hover:text-text-primary flex items-center gap-2">
                                <AddIcon className="h-4 w-4"/> Add Task
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default ListView;