
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { getFeedbackItems, updateFeedbackItemStatus, updateFeedbackItem } from '../utils/feedbackUtils';
import { FeedbackItem } from '../types';
import { VideoIcon } from '../components/icons/VideoIcon';
import FeedbackItemCard from '../components/feedback/FeedbackItemCard';

const FeedbackVideosPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { data } = useData();
    const project = data.projects.find(p => p.id === projectId);

    const [videos, setVideos] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'unapproved'>('all');

    useEffect(() => {
        if (projectId) {
            getFeedbackItems(projectId).then(items => {
                const videoItems = items.filter(item => item.type === 'video');
                setVideos(videoItems);
                setLoading(false);
            });
        }
    }, [projectId]);

    const filteredVideos = statusFilter === 'all'
        ? videos
        : statusFilter === 'approved'
        ? videos.filter(v => v.status === 'approved')
        : videos.filter(v => v.status !== 'approved');

    const handleEdit = async (videoId: string, newName: string, newDescription?: string) => {
        if (!projectId) {
            console.error('Missing projectId');
            return;
        }

        try {
            console.log('Updating video:', { videoId, newName, newDescription });
            await updateFeedbackItem(projectId, videoId, {
                name: newName,
                description: newDescription
            });
            // Refresh data
            const items = await getFeedbackItems(projectId);
            const videoItems = items.filter(item => item.type === 'video');
            setVideos(videoItems);
            console.log('Successfully updated video');
        } catch (error) {
            console.error('Error updating video:', error);
        }
    };

    const handleStatusToggle = async (videoId: string) => {
        if (!projectId) return;
        const video = videos.find(v => v.id === videoId);
        if (!video) return;
        const newStatus = video.status === 'approved' ? 'in_review' : 'approved';
        await updateFeedbackItemStatus(projectId, videoId, newStatus);
        // Refresh data
        const items = await getFeedbackItems(projectId);
        const videoItems = items.filter(item => item.type === 'video');
        setVideos(videoItems);
    };

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

                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }
            `}</style>

            {/* Status Filter */}
            <div className="mt-6 flex gap-2 animate-fade-in" style={{ animationDelay: '100ms' }}>
                <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                        statusFilter === 'all'
                            ? 'bg-primary text-black shadow-lg'
                            : 'bg-glass/40 backdrop-blur-xl border border-border-color text-text-secondary hover:text-text-primary hover:bg-glass/60'
                    }`}
                >
                    All ({videos.length})
                </button>
                <button
                    onClick={() => setStatusFilter('approved')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                        statusFilter === 'approved'
                            ? 'bg-green-500 text-white shadow-lg'
                            : 'bg-glass/40 backdrop-blur-xl border border-border-color text-text-secondary hover:text-text-primary hover:bg-glass/60'
                    }`}
                >
                    Approved ({videos.filter(v => v.status === 'approved').length})
                </button>
                <button
                    onClick={() => setStatusFilter('unapproved')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                        statusFilter === 'unapproved'
                            ? 'bg-yellow-500 text-black shadow-lg'
                            : 'bg-glass/40 backdrop-blur-xl border border-border-color text-text-secondary hover:text-text-primary hover:bg-glass/60'
                    }`}
                >
                    Unapproved ({videos.filter(v => v.status !== 'approved').length})
                </button>
            </div>

            <div className="mt-8">
                {loading ? (
                    <div className="text-center py-10 text-text-secondary">Loading videos...</div>
                ) : filteredVideos.length === 0 ? (
                    <div className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-xl animate-fade-in">
                        <div className="w-20 h-20 rounded-full bg-primary/10 backdrop-blur-sm flex items-center justify-center mb-6 border border-primary/20">
                            <VideoIcon className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-text-primary mb-2">No Videos Yet</h3>
                        <p className="text-text-secondary/90 max-w-md">
                            Create a new video feedback request from the main project feedback page.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredVideos.map((video, index) => (
                            <FeedbackItemCard
                                key={video.id}
                                type="video"
                                id={video.id}
                                name={video.name}
                                description={video.description}
                                assetUrl={video.assetUrl}
                                version={`v${video.version || 1}`}
                                createdAt={video.createdAt}
                                commentCount={video.commentCount}
                                status={video.status}
                                projectId={projectId!}
                                projectName={project?.name}
                                versions={video.versions || []}
                                currentVersion={video.version || 1}
                                onEdit={handleEdit}
                                onToggleApproval={handleStatusToggle}
                                index={index}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FeedbackVideosPage;
