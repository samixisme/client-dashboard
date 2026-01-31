
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { getFeedbackItems } from '../utils/feedbackUtils';
import { FeedbackItem } from '../types';
import { VideoIcon } from '../components/icons/VideoIcon';
import { PlayIcon } from '../components/icons/PlayIcon';

const FeedbackVideosPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { data } = useData();
    const project = data.projects.find(p => p.id === projectId);

    const [videos, setVideos] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (projectId) {
            getFeedbackItems(projectId).then(items => {
                const videoItems = items.filter(item => item.type === 'video');
                setVideos(videoItems);
                setLoading(false);
            });
        }
    }, [projectId]);

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

            <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
                <h1 className="text-4xl font-bold text-text-primary bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text">
                    {project?.name} Videos
                </h1>
                <p className="mt-2 text-text-secondary/90 font-medium">
                    Review and manage all video feedback requests.
                </p>
            </div>

            <div className="mt-8">
                {loading ? (
                    <div className="text-center py-10 text-text-secondary">Loading videos...</div>
                ) : videos.length === 0 ? (
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
                        {videos.map((video, index) => (
                            <Link
                                key={video.id}
                                to={`/feedback/${projectId}/video/${video.id}`}
                                className="bg-glass/40 backdrop-blur-xl rounded-2xl border border-border-color overflow-hidden hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:scale-[1.03] hover:bg-glass/60 transition-all duration-500 cursor-pointer group animate-fade-in-up relative block"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {/* Gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                <div className="aspect-video bg-black relative overflow-hidden flex items-center justify-center">
                                    <video
                                        src={video.assetUrl}
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity duration-300"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-16 h-16 rounded-full bg-primary/20 backdrop-blur-md border-2 border-primary/40 flex items-center justify-center group-hover:scale-125 group-hover:bg-primary/30 transition-all duration-300 shadow-lg">
                                            <PlayIcon className="w-7 h-7 text-white ml-1" />
                                        </div>
                                    </div>

                                    {/* Enhanced status badge */}
                                    <div className={`absolute top-2 right-2 px-2.5 py-1 rounded-lg text-xs font-semibold border backdrop-blur-sm shadow-sm transition-all duration-300 ${
                                        video.status === 'approved'
                                            ? 'bg-green-500/20 text-green-300 border-green-500/30'
                                            : video.status === 'changes_requested'
                                            ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                            : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                                    }`}>
                                        {video.status.replace('_', ' ')}
                                    </div>
                                </div>

                                <div className="p-5 relative z-10">
                                    <h3 className="text-lg font-bold text-text-primary mb-2 group-hover:text-primary transition-colors duration-300">
                                        {video.name}
                                    </h3>
                                    <p className="text-sm text-text-secondary/90 line-clamp-2 mb-4">
                                        {video.description}
                                    </p>
                                    <div className="flex justify-between items-center text-xs text-text-secondary/80 pt-3 border-t border-border-color/30">
                                        <span className="font-medium">{new Date(video.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                                        <span className="font-medium">{video.commentCount || 0} Comments</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FeedbackVideosPage;
