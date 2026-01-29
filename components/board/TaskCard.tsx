import React from 'react';
import { Link } from 'react-router-dom';
import { Task } from '../../types';
import { useData } from '../../contexts/DataContext';
import { MoreIcon } from '../icons/MoreIcon';
import { CalendarIcon } from '../icons/CalendarIcon';
import { RoadmapIcon } from '../icons/RoadmapIcon';

interface TaskCardProps {
    task: Task;
}

const PriorityBox: React.FC<{ priority: Task['priority'] }> = ({ priority }) => {
    const priorityClasses = {
        High: 'bg-red-500/20 text-red-400',
        Medium: 'bg-yellow-500/20 text-yellow-400',
        Low: 'bg-green-500/20 text-green-400',
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded ${priorityClasses[priority]}`}>{priority}</span>;
}

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
    const { data } = useData();
    const { tags, users, roadmapItems, boards, projects } = data;
    const taskTags = tags.filter(t => task.labelIds.includes(t.id));
    const assignees = users.filter(m => task.assignees.includes(m.id));
    
    const roadmapItem = task.roadmapItemId ? roadmapItems.find(r => r.id === task.roadmapItemId) : null;
    const board = boards.find(b => b.id === task.boardId);
    const project = board ? projects.find(p => p.id === board.projectId) : undefined;


    return (
        <div className="bg-glass/40 backdrop-blur-xl p-3 rounded-xl border border-border-color shadow-md cursor-pointer hover:bg-glass/60 hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-300 flex flex-col gap-2 group">
            <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-text-primary pr-2 flex-1 group-hover:text-primary transition-colors duration-300">{task.title}</p>
                 <button className="text-text-secondary hover:text-primary hover:scale-110 transition-all duration-300 flex-shrink-0">
                    <MoreIcon className="w-5 h-5"/>
                 </button>
            </div>

            {taskTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {taskTags.map(tag => (
                        <span key={tag.id} className="px-2 py-0.5 text-xs font-semibold rounded-lg backdrop-blur-sm" style={{ backgroundColor: `${tag.color}40`, color: tag.color }}>{tag.name}</span>
                    ))}
                </div>
            )}

            <div className="flex items-center justify-between mt-1 pt-3 border-t border-border-color/50">
                <div className="flex -space-x-2">
                    {assignees.map(member => (
                        <img key={member.id} src={member.avatarUrl} alt={member.name} title={member.name} className="w-6 h-6 rounded-full border-2 border-surface shadow-md transition-all duration-300 hover:scale-125 hover:z-10 hover:border-primary hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
                    ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <PriorityBox priority={task.priority} />
                    {roadmapItem && project && (
                        <Link
                            to={`/projects/${project.id}/roadmap`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-medium hover:bg-purple-500/40 hover:scale-110 transition-all duration-300"
                            title={roadmapItem.title}
                        >
                            <RoadmapIcon className="w-3.5 h-3.5"/>
                        </Link>
                    )}
                    {(task.start_date || task.dueDate) && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-glass-light/60 backdrop-blur-sm text-text-secondary text-xs font-medium">
                            <CalendarIcon className="w-3.5 h-3.5"/>
                            <span className="whitespace-nowrap">
                                {task.start_date && formatDate(task.start_date)}
                                {(task.start_date && task.dueDate) && ' - '}
                                {task.dueDate && formatDate(task.dueDate)}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskCard;
