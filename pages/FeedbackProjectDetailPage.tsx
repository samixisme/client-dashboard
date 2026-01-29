
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

const WidgetLink = ({ to, Icon, title, count, label, index }: { to: string, Icon: React.FC<any>, title: string, count: number, label: string, index?: number }) => (
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
    </Link>
);


const FeedbackProjectDetailPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { data } = useData();
    const { projects } = data;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [stats, setStats] = useState({ mockups: 0, websites: 0, videos: 0 });
    const [isCleaningUp, setIsCleaningUp] = useState(false);

    const project = useMemo(() => projects.find(p => p.id === projectId), [projectId, projects]);

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
            `}</style>

            <div className="flex justify-between items-center mb-8 flex-wrap gap-4 animate-fade-in">
                <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
                    <h1 className="text-4xl font-bold text-text-primary bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text">{project.name} Feedback</h1>
                    <p className="mt-2 text-text-secondary/90 font-medium">Review and manage all feedback tasks and assets for this project.</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap animate-slide-in-right">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <WidgetLink to={`/feedback/${projectId}/mockups`} Icon={MockupIcon} title="Mockups" count={stats.mockups} label="Collections" index={0} />
                <WidgetLink to={`/feedback/${projectId}/websites`} Icon={WebsiteIcon} title="Websites" count={stats.websites} label="Collections" index={1} />
                <WidgetLink to={`/feedback/${projectId}/videos`} Icon={VideoIcon} title="Videos" count={stats.videos} label="Collections" index={2} />
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                <FeedbackTasksView projectId={projectId!} />
            </div>

            {isModalOpen && <AddFeedbackRequestModal projectId={projectId!} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
};

export default FeedbackProjectDetailPage;
