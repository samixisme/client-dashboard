
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

const WidgetLink = ({ to, Icon, title, count, label }: { to: string, Icon: React.FC<any>, title: string, count: number, label: string }) => (
    <Link to={to} className="bg-glass p-6 rounded-lg shadow-md border border-border-color transition-all hover:shadow-lg hover:border-primary block">
        <div className="flex items-center mb-4">
            <div className="p-2 bg-primary/20 rounded-md">
                <Icon className="h-6 w-6 text-primary" />
            </div>
            <h2 className="ml-4 text-xl font-semibold text-text-primary">{title}</h2>
        </div>
        <p className="text-sm text-text-secondary">{count} {label}</p>
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
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-text-primary">{project.name} Feedback</h1>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleCleanup} 
                        disabled={isCleaningUp}
                        className="px-4 py-2 bg-red-500/20 text-red-400 text-sm font-bold rounded-lg hover:bg-red-500/30 border border-red-500/30 disabled:opacity-50"
                    >
                        {isCleaningUp ? 'Cleaning...' : 'Clear Data'}
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover flex items-center gap-2">
                        <AddIcon className="h-4 w-4"/> New Feedback Request
                    </button>
                </div>
            </div>
            <p className="mt-2 text-text-secondary mb-8">Review and manage all feedback tasks and assets for this project.</p>


            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <WidgetLink to={`/feedback/${projectId}/mockups`} Icon={MockupIcon} title="Mockups" count={stats.mockups} label="Collections" />
                <WidgetLink to={`/feedback/${projectId}/websites`} Icon={WebsiteIcon} title="Websites" count={stats.websites} label="Collections" />
                <WidgetLink to={`/feedback/${projectId}/videos`} Icon={VideoIcon} title="Videos" count={stats.videos} label="Collections" />
            </div>

            <div className="mb-12">
                <h2 className="text-2xl font-bold text-text-primary mb-4">Tasks</h2>
                <FeedbackTasksView projectId={projectId!} />
            </div>

            <div>
                <h2 className="text-2xl font-bold text-text-primary mb-4">Activity</h2>
                <FeedbackActivityView projectId={projectId!} />
            </div>

            {isModalOpen && <AddFeedbackRequestModal projectId={projectId!} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
};

export default FeedbackProjectDetailPage;
