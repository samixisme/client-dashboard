
import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { User } from '../../types';
import { SearchIcon } from '../icons/SearchIcon';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../utils/firebase';

interface Task {
    id: string;
    title: string;
    description?: string;
    dueDate?: string;
    status: string;
    priority?: string;
    assigneeId?: string;
    projectId: string;
    sourceCommentId?: string;
    sourceFeedbackItemId?: string;
    sourceFeedbackItemName?: string;
    sourceType?: string;
    createdAt?: any;
}

const FeedbackTasksView = ({ projectId }: { projectId: string }) => {
    const { data } = useData();
    const { users } = data;

    const [tasks, setTasks] = useState<Task[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [loading, setLoading] = useState(true);

    // Subscribe to tasks from the tasks collection
    useEffect(() => {
        const tasksQuery = query(
            collection(db, "tasks"),
            where("projectId", "==", projectId),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
            const fetchedTasks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Task));
            setTasks(fetchedTasks);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tasks:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId]);

    const getUser = (userId?: string): User | undefined => {
        return users.find(u => u.id === userId);
    };

    const filteredTasks = tasks.filter(task => {
        if (statusFilter !== 'All' && task.status !== statusFilter) return false;
        if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return '-';
        }
    };

    return (
        <div>
            <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="relative flex-grow">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3"><SearchIcon className="h-5 w-5 text-text-secondary"/></span>
                    <input 
                        type="search" 
                        placeholder="Search tasks..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full md:w-72 pl-10 pr-4 py-2 rounded-lg bg-glass focus:outline-none text-text-primary border border-border-color" 
                    />
                </div>
                {/* Filters */}
                <select 
                    value={statusFilter} 
                    onChange={e => setStatusFilter(e.target.value)} 
                    className="bg-glass border border-border-color rounded-lg px-3 py-2 text-sm text-text-primary"
                >
                    <option value="All">All Tasks</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                </select>
            </div>
            
            {loading ? (
                <div className="p-8 text-center text-text-secondary">Loading tasks...</div>
            ) : (
                <div className="bg-glass rounded-lg border border-border-color overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border-color">
                            <thead className="bg-glass-light">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Task</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Source</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Assigned To</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Due Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-color">
                                {filteredTasks.map(task => {
                                    const assignee = getUser(task.assigneeId);
                                    
                                    return (
                                        <tr key={task.id} className="hover:bg-glass-light transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-medium text-text-primary">{task.title}</span>
                                                {task.description && (
                                                    <p className="text-xs text-text-secondary truncate max-w-xs">{task.description}</p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                                {task.sourceFeedbackItemName || task.sourceType || 'Manual'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    {assignee?.avatarUrl ? (
                                                        <img src={assignee.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                                            {assignee?.name?.[0] || '?'}
                                                        </div>
                                                    )}
                                                    <span className="text-sm text-text-primary">{assignee?.name || 'Unassigned'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                                {formatDate(task.dueDate)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                                                    ${task.status === 'completed' ? 'bg-green-500/20 text-green-300' : 
                                                      task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-300' : 
                                                      'bg-yellow-500/20 text-yellow-300'}`}>
                                                    {task.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                {task.sourceFeedbackItemId ? (
                                                    <Link 
                                                        to={`/feedback/${projectId}/mockup/${task.sourceFeedbackItemId}`} 
                                                        className="text-primary hover:text-primary-hover"
                                                    >
                                                        View Source
                                                    </Link>
                                                ) : (
                                                    <span className="text-text-secondary">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                                {filteredTasks.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-text-secondary">
                                            {tasks.length === 0 
                                                ? 'No tasks yet. Tasks are created when comments have due dates.'
                                                : 'No tasks match your search.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeedbackTasksView;
