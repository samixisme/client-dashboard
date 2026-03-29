import React, { useMemo } from 'react';
import { useData } from '../../../contexts/DataContext';
import { Task } from '../../../types';

const PriorityBox: React.FC<{ priority: Task['priority'] }> = ({ priority }) => {
    const priorityClasses = {
        High: 'bg-red-500/20 text-red-400',
        Medium: 'bg-yellow-500/20 text-yellow-400',
        Low: 'bg-green-500/20 text-green-400',
    };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded ${priorityClasses[priority]}`}>{priority}</span>;
}


const TableView: React.FC<{ boardId: string; onTaskClick: (task: Task) => void; }> = ({ boardId, onTaskClick }) => {
    const { data } = useData();

    // Convert arrays to Maps for O(1) lookups during render loop, optimizing performance from O(N*M) to O(N+M)
    const { tasks, stagesMap, membersMap, tagsMap } = useMemo(() => {
        const boardTasks = data.tasks.filter(t => t.boardId === boardId);

        const sMap = new Map(data.stages.map(s => [s.id, s]));
        const mMap = new Map(data.board_members.map(m => [m.id, m]));
        const tMap = new Map(data.tags.map(t => [t.id, t]));

        return { tasks: boardTasks, stagesMap: sMap, membersMap: mMap, tagsMap: tMap };
    }, [data.tasks, data.stages, data.board_members, data.tags, boardId]);
    
    return (
        <div className="w-full bg-glass/60 backdrop-blur-xl rounded-xl border border-border-color overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr className="border-b border-border-color bg-glass/60 backdrop-blur-xl">
                            <th className="p-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Task</th>
                            <th className="p-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Tags</th>
                            <th className="p-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Stage</th>
                            <th className="p-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Priority</th>
                            <th className="p-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Assignees</th>
                            <th className="p-4 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Due Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tasks.map(task => {
                            const stage = stagesMap.get(task.stageId);
                            const assignees = task.assignees.map(id => membersMap.get(id)).filter(Boolean) as typeof data.board_members;
                            const taskTags = task.labelIds.map(id => tagsMap.get(id)).filter(Boolean) as typeof data.tags;
                            return (
                                <tr key={task.id} onClick={() => onTaskClick(task)} className="border-b border-border-color last:border-b-0 bg-glass/20 hover:bg-glass-light/80 hover:shadow-lg hover:scale-[1.01] cursor-pointer transition-all duration-300">
                                    <td className="p-4 font-semibold text-text-primary whitespace-nowrap">{task.title}</td>
                                    <td className="p-4 whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            {taskTags.map(tag => (
                                                <span key={tag.id} className="px-2 py-1 text-xs font-semibold rounded-lg" style={{ backgroundColor: `${tag.color}40`, color: tag.color }}>{tag.name}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-4 text-text-secondary whitespace-nowrap font-medium">{stage?.name || 'N/A'}</td>
                                    <td className="p-4 font-medium">
                                        <PriorityBox priority={task.priority} />
                                    </td>
                                    <td className="p-4">
                                        <div className="flex -space-x-2">
                                            {assignees.map(member => (
                                                <img key={member.id} src={member.avatarUrl} alt={member.name} title={member.name} className="w-8 h-8 rounded-full border-2 border-surface shadow-md" />
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-4 text-text-secondary whitespace-nowrap">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {tasks.length === 0 && (
                    <p className="text-center text-text-secondary py-10">No tasks on this board.</p>
                )}
            </div>
        </div>
    );
};

export default TableView;