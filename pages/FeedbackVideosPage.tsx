
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
            <h1 className="text-3xl font-bold text-text-primary">Video Feedback for {project?.name}</h1>
            <p className="mt-2 text-text-secondary">Review and manage all video feedback requests.</p>
            
            <div className="mt-8">
                {loading ? (
                    <div className="text-center py-10 text-text-secondary">Loading videos...</div>
                ) : videos.length === 0 ? (
                    <div className="bg-glass border border-border-color rounded-xl p-10 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-glass-light flex items-center justify-center mb-4">
                            <VideoIcon className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-text-primary">No Videos Yet</h3>
                        <p className="text-text-secondary max-w-md mt-2">
                            Create a new video feedback request from the main project feedback page.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {videos.map(video => (
                            <Link 
                                key={video.id} 
                                to={`/feedback/${projectId}/video/${video.id}`}
                                className="group bg-glass rounded-lg border border-border-color overflow-hidden hover:border-primary transition-all shadow-sm hover:shadow-md block"
                            >
                                <div className="aspect-video bg-black relative overflow-hidden flex items-center justify-center group">
                                     <video src={video.assetUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
                                     <div className="absolute inset-0 flex items-center justify-center">
                                         <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                             <PlayIcon className="w-6 h-6 text-white ml-1" />
                                         </div>
                                     </div>
                                    <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold uppercase ${
                                        video.status === 'approved' ? 'bg-green-500 text-white' : 
                                        video.status === 'changes_requested' ? 'bg-red-500 text-white' : 
                                        'bg-yellow-500 text-white'
                                    }`}>
                                        {video.status.replace('_', ' ')}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="text-lg font-semibold text-text-primary mb-1 group-hover:text-primary transition-colors">{video.name}</h3>
                                    <p className="text-sm text-text-secondary line-clamp-2">{video.description}</p>
                                    <div className="mt-4 flex justify-between items-center text-xs text-text-secondary">
                                        <span>{new Date(video.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                                        <span>{video.commentCount || 0} Comments</span>
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
