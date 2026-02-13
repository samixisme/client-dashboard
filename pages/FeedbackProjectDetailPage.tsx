
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { MockupIcon } from '../components/icons/MockupIcon';
import { VideoIcon } from '../components/icons/VideoIcon';
import { WebsiteIcon } from '../components/icons/WebsiteIcon';
import { AddIcon } from '../components/icons/AddIcon';
import FeedbackTasksView from '../components/feedback/FeedbackTasksView';
import FeedbackActivityView from '../components/feedback/FeedbackActivityView';
import AddFeedbackRequestModal from '../components/feedback/AddFeedbackRequestModal';
import { getFeedbackItems, cleanupOrphanedData } from '../utils/feedbackUtils';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { Task } from '../types';

interface TaskStats {
    pending: number;
    inProgress: number;
    completed: number;
}

const WidgetLink = ({
    to, Icon, title, count, label, index, tasks, taskStats
}: {
    to: string;
    Icon: React.FC<any>;
    title: string;
    count: number;
    label: string;
    index?: number;
    tasks?: Task[];
    taskStats?: TaskStats;
}) => {
    const totalTasks = tasks?.length || 0;
    const progress = totalTasks > 0 && taskStats
        ? ((taskStats.completed || 0) / totalTasks) * 100
        : 0;
    const recentTask = tasks?.[0]; // Most recent

    return (
        <Link
            to={to}
            className="bg-glass/40 backdrop-blur-xl p-6 rounded-2xl border border-border-color hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:scale-[1.03] hover:bg-glass/60 transition-all duration-500 cursor-pointer group animate-fade-in-up relative overflow-hidden block"
            style={{ animationDelay: `${(index || 0) * 50}ms` }}
        >
            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="flex items-center mb-4 relative z-10">
                <div className="p-3 bg-glass-light/60 backdrop-blur-sm rounded-xl border border-border-color/50 group-hover:border-primary/40 group-hover:bg-primary/10 transition-all duration-300">
                    <Icon className="h-6 w-6 text-primary" />
                </div>
                <h2 className="ml-4 text-xl font-bold text-text-primary group-hover:text-primary transition-colors duration-300">{title}</h2>
            </div>
            <div className="flex items-center gap-2 relative z-10">
                <p className="text-2xl font-bold text-text-primary group-hover:text-primary transition-colors duration-300">{count}</p>
                <p className="text-sm text-text-secondary/90">{label}</p>
            </div>

            {/* NEW: Task Stats Section */}
            {totalTasks > 0 && taskStats && (
                <div className="mt-4 pt-4 border-t border-border-color/30 relative z-10">
                    {/* Task count badges */}
                    <div className="flex gap-2 mb-3 flex-wrap">
                        {taskStats.pending > 0 && (
                            <span className="text-xs px-2.5 py-1 bg-yellow-500/20 text-yellow-300 rounded-lg font-semibold border border-yellow-500/30 shadow-sm">
                                {taskStats.pending} pending
                            </span>
                        )}
                        {taskStats.inProgress > 0 && (
                            <span className="text-xs px-2.5 py-1 bg-blue-500/20 text-blue-300 rounded-lg font-semibold border border-blue-500/30 shadow-sm">
                                {taskStats.inProgress} active
                            </span>
                        )}
                        {taskStats.completed > 0 && (
                            <span className="text-xs px-2.5 py-1 bg-green-500/20 text-green-300 rounded-lg font-semibold border border-green-500/30 shadow-sm">
                                {taskStats.completed} done
                            </span>
                        )}
                    </div>

                    {/* Mini progress bar */}
                    <div className="w-full bg-glass-light/50 backdrop-blur-sm rounded-full h-2 overflow-hidden border border-border-color/30 shadow-inner mb-3">
                        <div
                            className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(var(--primary-rgb),0.5)] relative overflow-hidden"
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                        </div>
                    </div>

                    {/* Recent task preview */}
                    {recentTask && (
                        <div className="flex items-center gap-2 bg-glass-light/30 p-2 rounded-lg">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
                            <p className="text-xs text-text-secondary truncate">
                                {recentTask.title}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </Link>
    );
};


const FeedbackProjectDetailPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { data } = useData();
    const { projects } = data;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
    const [stats, setStats] = useState({ mockups: 0, websites: 0, videos: 0 });
    const [isCleaningUp, setIsCleaningUp] = useState(false);
    const [feedbackTasks, setFeedbackTasks] = useState<Map<string, Task[]>>(new Map());

    const project = useMemo(() => projects.find(p => p.id === projectId), [projectId, projects]);

    // Fetch feedback items stats
    useEffect(() => {
        if (projectId) {
            getFeedbackItems(projectId).then(items => {
                setStats({
                    mockups: items.filter(i => i.type === 'mockup').length,
                    websites: items.filter(i => i.type === 'website').length,
                    videos: items.filter(i => i.type === 'video').length,
                });
            });
        }
    }, [projectId, isModalOpen]); // Re-fetch when modal closes (new item added)

    // Fetch feedback tasks from Firestore
    useEffect(() => {
        if (!projectId) return;

        const tasksQuery = query(
            collection(db, "tasks"),
            where("projectId", "==", projectId)
        );

        const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
            const tasks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Task));

            // Sort by createdAt descending (most recent first)
            tasks.sort((a, b) => {
                const aTime = (a.createdAt as any)?.seconds || 0;
                const bTime = (b.createdAt as any)?.seconds || 0;
                return bTime - aTime;
            });

            // Group by sourceType
            const mockupTasks = tasks.filter(t => t.sourceType === 'mockup' || (!t.sourceType && data.feedbackMockups?.some(m => m.id === t.sourceFeedbackItemId)));
            const websiteTasks = tasks.filter(t => t.sourceType === 'website' || (!t.sourceType && data.feedbackWebsites?.some(w => w.id === t.sourceFeedbackItemId)));
            const videoTasks = tasks.filter(t => t.sourceType === 'video' || (!t.sourceType && data.feedbackVideos?.some(v => v.id === t.sourceFeedbackItemId)));

            const taskMap = new Map();
            taskMap.set('mockup', mockupTasks);
            taskMap.set('website', websiteTasks);
            taskMap.set('video', videoTasks);

            setFeedbackTasks(taskMap);
        }, (error) => {
            console.error("Error fetching feedback tasks:", error);
        });

        return () => unsubscribe();
    }, [projectId, data.feedbackMockups, data.feedbackWebsites, data.feedbackVideos]);

    // Calculate task stats for a given task array
    const getTaskStats = (tasks: Task[]): TaskStats => ({
        pending: tasks.filter(t => t.status === 'pending').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
    });

    const handleCleanup = async () => {
        if (!projectId) return;
        if (window.confirm('Are you sure you want to clear all tasks and activity data for this project? This cannot be undone.')) {
            setIsCleaningUp(true);
            try {
                const result = await cleanupOrphanedData(projectId);
                alert(`Cleanup complete! Deleted ${result.tasksDeleted} tasks and ${result.activitiesDeleted} activities.`);
            } catch (error) {
                alert('Error during cleanup. Check console for details.');
            }
            setIsCleaningUp(false);
        }
    };

    if (!project) {
        return <div className="text-center p-10">Project not found.</div>;
    }

    // Get task data for WidgetLinks
    const mockupTasks = feedbackTasks.get('mockup') || [];
    const websiteTasks = feedbackTasks.get('website') || [];
    const videoTasks = feedbackTasks.get('video') || [];

    const totalTaskCount = mockupTasks.length + websiteTasks.length + videoTasks.length;

    return (
        <div>
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

                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }
            `}</style>

            {/* Header - Title and Description Removed */}
            <div className="flex justify-end items-center mb-8 flex-wrap gap-4 animate-fade-in">
                <div className="flex items-center gap-3 flex-wrap animate-slide-in-right">
                    {totalTaskCount > 0 && (
                        <button
                            onClick={() => setIsTasksModalOpen(true)}
                            className="px-5 py-2.5 bg-glass/60 backdrop-blur-xl text-text-primary text-sm font-semibold rounded-xl border border-border-color hover:bg-glass hover:shadow-xl hover:scale-105 hover:border-primary/40 transition-all duration-300 shadow-md flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            View All Tasks ({totalTaskCount})
                        </button>
                    )}
                    <button
                        onClick={handleCleanup}
                        disabled={isCleaningUp}
                        className="px-4 py-2.5 bg-red-500/15 text-red-400 text-sm font-bold rounded-xl hover:bg-red-500/25 hover:scale-105 hover:shadow-lg border border-red-500/30 backdrop-blur-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                        {isCleaningUp ? 'Cleaning...' : 'Clear Data'}
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-6 py-2.5 bg-primary text-background text-sm font-bold rounded-xl hover:bg-primary-hover hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.5)] hover:scale-110 transition-all duration-300 shadow-lg relative overflow-hidden group"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            <AddIcon className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300"/>
                            New Feedback Request
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </button>
                </div>
            </div>

            {/* Enhanced WidgetLinks with Task Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <WidgetLink
                    to={`/feedback/${projectId}/mockups`}
                    Icon={MockupIcon}
                    title="Mockups"
                    count={stats.mockups}
                    label="Collections"
                    index={0}
                    tasks={mockupTasks}
                    taskStats={getTaskStats(mockupTasks)}
                />
                <WidgetLink
                    to={`/feedback/${projectId}/websites`}
                    Icon={WebsiteIcon}
                    title="Websites"
                    count={stats.websites}
                    label="Collections"
                    index={1}
                    tasks={websiteTasks}
                    taskStats={getTaskStats(websiteTasks)}
                />
                <WidgetLink
                    to={`/feedback/${projectId}/videos`}
                    Icon={VideoIcon}
                    title="Videos"
                    count={stats.videos}
                    label="Collections"
                    index={2}
                    tasks={videoTasks}
                    taskStats={getTaskStats(videoTasks)}
                />
            </div>

            {/* Modals */}
            {isModalOpen && <AddFeedbackRequestModal projectId={projectId!} onClose={() => setIsModalOpen(false)} />}

            {/* View All Tasks Modal */}
            {isTasksModalOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setIsTasksModalOpen(false)}
                >
                    <div
                        className="bg-surface/95 backdrop-blur-xl rounded-2xl border border-border-color shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden animate-fade-in-up"
                        onClick={(e) => e.stopPropagation()}
                        style={{ animationDelay: '0ms' }}
                    >
                        {/* Modal Header */}
                        <div className="p-6 border-b border-border-color flex justify-between items-center bg-glass-light/30 backdrop-blur-xl">
                            <div>
                                <h2 className="text-2xl font-bold text-text-primary">All Feedback Tasks</h2>
                                <p className="text-sm text-text-secondary mt-1">{project.name} - {totalTaskCount} total tasks</p>
                            </div>
                            <button
                                onClick={() => setIsTasksModalOpen(false)}
                                className="text-text-secondary hover:text-text-primary text-3xl leading-none p-2 hover:bg-glass-light rounded-lg transition-all duration-200 hover:scale-110"
                            >
                                ×
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
                            <FeedbackTasksView projectId={projectId!} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeedbackProjectDetailPage;
