
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FeedbackItem } from '../types';
import { getFeedbackItem, updateFeedbackItemVideos } from '../utils/feedbackUtils';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { AddIcon } from '../components/icons/AddIcon';
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';
import { VideoIcon } from '../components/icons/VideoIcon';
import { PlayIcon } from '../components/icons/PlayIcon';

const FeedbackVideoVersionsSelectionPage = () => {
    const { projectId, feedbackItemId } = useParams<{ projectId: string; feedbackItemId: string }>();
    const navigate = useNavigate();
    const [item, setItem] = useState<FeedbackItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'approved' | 'unapproved'>('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newVideoName, setNewVideoName] = useState('');
    const [newVideoUrl, setNewVideoUrl] = useState('');

    useEffect(() => {
        if (projectId && feedbackItemId) {
            getFeedbackItem(projectId, feedbackItemId).then(fetchedItem => {
                setItem(fetchedItem);
                setIsLoading(false);
            });
        }
    }, [projectId, feedbackItemId]);

    const filteredVideos = item?.videos?.filter(video => {
        if (filter === 'approved') return video.approved;
        if (filter === 'unapproved') return !video.approved;
        return true;
    }) || [];

    const handleAddVideo = async () => {
        if (!newVideoName || !newVideoUrl || !item || !projectId || !feedbackItemId) return;
        
        const newVideo = {
            id: `vid-${Date.now()}`,
            name: newVideoName,
            url: newVideoUrl,
            approved: false
        };

        const updatedVideos = [...(item.videos || []), newVideo];
        
        // Optimistic update
        const updatedItem = { ...item, videos: updatedVideos };
        setItem(updatedItem);
        setShowAddModal(false);
        setNewVideoName('');
        setNewVideoUrl('');

        await updateFeedbackItemVideos(projectId, feedbackItemId, updatedVideos);
    };

    if (isLoading) return <div className="h-screen w-full flex items-center justify-center text-text-primary">Loading...</div>;
    if (!item) return <div className="h-screen w-full flex items-center justify-center text-red-500">Item not found</div>;

    const hasVideos = item.videos && item.videos.length > 0;

    return (
        <div className="min-h-screen text-text-primary p-8">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                     <button onClick={() => navigate(`/feedback/${projectId}/videos`)} className="p-2 bg-glass/40 backdrop-blur-sm hover:bg-glass/60 rounded-full transition-colors">
                        <ArrowLeftIcon className="w-5 h-5 text-text-secondary" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">{item.name}</h1>
                        <p className="text-text-secondary text-sm">Select a version or clip to view feedback</p>
                    </div>
                </div>
            </div>

            {/* Filter Tabs & Add Button */}
            <div className="flex items-center justify-between mb-8 border-b border-border-color pb-1">
                <div className="flex gap-6">
                    {(['all', 'approved', 'unapproved'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`pb-3 px-1 text-sm font-medium transition-colors relative capitalize ${
                                filter === f ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
                            }`}
                        >
                            {f}
                            {filter === f && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
                            )}
                        </button>
                    ))}
                </div>
                <button 
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-primary text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-hover transition-colors mb-2"
                >
                    <AddIcon className="w-4 h-4" />
                    Add Version
                </button>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {/* Default/Main Video */}
                 {!hasVideos && (
                    <div
                        onClick={() => navigate(`/feedback/${projectId}/video/${feedbackItemId}/view`)}
                        className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-xl overflow-hidden cursor-pointer hover:border-primary transition-all group relative aspect-video flex flex-col shadow-sm hover:shadow-md"
                    >
                         <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
                            {/* Simple placeholder for video preview since we can't easily generate thumbnails reliably without backend processing */}
                            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all">
                                <PlayIcon className="w-6 h-6 ml-1" />
                            </div>
                         </div>
                         <div className="p-4 bg-glass/40 backdrop-blur-xl border-t border-border-color">
                            <h3 className="font-bold text-lg group-hover:text-primary transition-colors">Main Version</h3>
                            <p className="text-text-secondary text-xs truncate mt-1">Default Asset</p>
                         </div>
                    </div>
                )}

                {filteredVideos.map(video => (
                    <div
                        key={video.id}
                        onClick={() => navigate(`/feedback/${projectId}/video/${feedbackItemId}/view?path=${encodeURIComponent(video.url)}`)}
                        className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-xl overflow-hidden cursor-pointer hover:border-primary transition-all group relative aspect-video flex flex-col shadow-sm hover:shadow-md"
                    >
                         <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
                             <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all">
                                <PlayIcon className="w-6 h-6 ml-1" />
                            </div>
                            <div className="absolute top-3 left-3">
                                {video.approved ? (
                                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-black shadow-lg">
                                        <CheckCircleIcon className="w-4 h-4" />
                                    </div>
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-glass/40 backdrop-blur-sm border border-white/20" />
                                )}
                            </div>
                         </div>
                         <div className="p-4 bg-glass/40 backdrop-blur-xl border-t border-border-color">
                            <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{video.name}</h3>
                            <p className="text-text-secondary text-xs truncate mt-1">{video.url}</p>
                         </div>
                    </div>
                ))}
            </div>

            {/* Add Video Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary/20 rounded-lg text-primary">
                                <VideoIcon className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold">Add New Version</h2>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-text-secondary mb-1">Version Name</label>
                                <input
                                    type="text"
                                    value={newVideoName}
                                    onChange={e => setNewVideoName(e.target.value)}
                                    placeholder="e.g. v2 - Adjusted Color"
                                    className="w-full bg-glass-light/60 backdrop-blur-sm border border-border-color rounded-lg px-4 py-2 text-text-primary focus:border-primary outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-text-secondary mb-1">Video URL</label>
                                <input
                                    type="text"
                                    value={newVideoUrl}
                                    onChange={e => setNewVideoUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full bg-glass-light/60 backdrop-blur-sm border border-border-color rounded-lg px-4 py-2 text-text-primary focus:border-primary outline-none font-mono text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 px-4 py-2 rounded-lg font-medium hover:bg-glass-light/60 transition-colors text-text-secondary"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleAddVideo}
                                disabled={!newVideoName || !newVideoUrl}
                                className="flex-1 bg-primary text-black px-4 py-2 rounded-lg font-bold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add Version
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeedbackVideoVersionsSelectionPage;
