import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { AddIcon } from '../components/icons/AddIcon';
import { CancelIcon } from '../components/icons/CancelIcon';
import { VideoAsset } from '../types';

const FeedbackVideoDetailPage = () => {
    const { projectId, videoId } = useParams<{ projectId: string; videoId: string }>();
    const navigate = useNavigate();
    const { data, forceUpdate } = useData();
    
    const videoCollection = useMemo(() => data.feedbackVideos.find(m => m.id === videoId), [data.feedbackVideos, videoId]);
    
    const [activeTab, setActiveTab] = useState<'all' | 'approved' | 'unapproved'>('all');
    const [description, setDescription] = useState(videoCollection?.description || '');
    const [isEditingDesc, setIsEditingDesc] = useState(false);

    // State for adding a new video
    const [isAdding, setIsAdding] = useState(false);
    const [newVideoName, setNewVideoName] = useState('');
    const [newVideoUrl, setNewVideoUrl] = useState('');

    const handleSaveDescription = () => {
        if (videoCollection) {
            videoCollection.description = description;
            forceUpdate();
            setIsEditingDesc(false);
        }
    };

    const handleAddVideo = (e: React.FormEvent) => {
        e.preventDefault();
        if (videoCollection && newVideoName.trim() && newVideoUrl.trim()) {
            const newVideo: VideoAsset = {
                id: `vid-asset-${Date.now()}`,
                name: newVideoName,
                url: newVideoUrl,
            };
            videoCollection.videos.push(newVideo);
            forceUpdate();
            setIsAdding(false);
            setNewVideoName('');
            setNewVideoUrl('');
        }
    };

    const handleDeleteVideo = (videoAssetId: string) => {
        if (videoCollection && window.confirm('Are you sure you want to delete this video?')) {
            videoCollection.videos = videoCollection.videos.filter(v => v.id !== videoAssetId);
            // Also delete comments associated with this video asset
            data.feedbackComments = data.feedbackComments.filter(c => c.videoAssetId !== videoAssetId);
            forceUpdate();
        }
    };

    const handleDeleteCollection = () => {
        if (videoCollection && window.confirm('Are you sure you want to delete this entire video collection and all its comments?')) {
            data.feedbackComments = data.feedbackComments.filter(c => c.targetId !== videoId);
            const index = data.feedbackVideos.findIndex(m => m.id === videoId);
            if (index > -1) {
                data.feedbackVideos.splice(index, 1);
            }
            forceUpdate();
            navigate(`/feedback/${projectId}`);
        }
    };

    const handleToggleVideoApproval = (videoAssetId: string) => {
        if (videoCollection) {
            if (!videoCollection.approvedVideoIds) videoCollection.approvedVideoIds = [];
            
            if (videoCollection.approvedVideoIds.includes(videoAssetId)) {
                videoCollection.approvedVideoIds = videoCollection.approvedVideoIds.filter(id => id !== videoAssetId);
            } else {
                videoCollection.approvedVideoIds.push(videoAssetId);
            }
            forceUpdate();
        }
    };

    const filteredVideos = useMemo(() => {
        if (!videoCollection) return [];
        switch (activeTab) {
            case 'approved':
                return videoCollection.videos.filter(v => videoCollection.approvedVideoIds?.includes(v.id));
            case 'unapproved':
                return videoCollection.videos.filter(v => !videoCollection.approvedVideoIds?.includes(v.id));
            case 'all':
            default:
                return videoCollection.videos;
        }
    }, [videoCollection, activeTab]);
    
    if (!videoCollection) {
        return <div className="text-center p-10">Video collection not found.</div>;
    }

    const tabs = [
        { id: 'all', name: 'All' },
        { id: 'approved', name: 'Approved' },
        { id: 'unapproved', name: 'Unapproved' },
    ];

    return (
        <div>
            <h1 className="text-3xl font-bold text-text-primary">{videoCollection.name}</h1>
            
            <div className="mt-8 bg-glass p-6 rounded-lg border border-border-color">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-semibold text-text-primary">Description</h2>
                    {isEditingDesc ? (
                        <div className="flex gap-2">
                            <button onClick={handleSaveDescription} className="px-3 py-1 bg-primary text-background text-xs font-bold rounded-lg hover:bg-primary-hover">Save</button>
                            <button onClick={() => setIsEditingDesc(false)} className="px-3 py-1 bg-glass-light text-text-primary text-xs rounded-lg">Cancel</button>
                        </div>
                    ) : (
                         <button onClick={() => setIsEditingDesc(true)} className="px-3 py-1 bg-glass-light text-text-primary text-xs rounded-lg">Edit</button>
                    )}
                </div>
                {isEditingDesc ? (
                    <textarea 
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={4}
                        className="w-full p-2 bg-glass-light border border-border-color rounded-md"
                    />
                ) : (
                    <p className="text-text-secondary">{description || 'No description provided.'}</p>
                )}
                 <div className="mt-4 pt-4 border-t border-border-color">
                    <h3 className="text-sm font-semibold text-red-400">Danger Zone</h3>
                    <button onClick={handleDeleteCollection} className="mt-2 text-sm bg-red-500/20 text-red-300 px-3 py-1 rounded-lg hover:bg-red-500/30 hover:text-red-200">
                        Delete this Collection
                    </button>
                </div>
            </div>

            <div className="mt-8 flex justify-between items-center border-b border-border-color">
                <div className="flex items-center gap-4">
                    {tabs.map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`py-2 px-4 text-sm font-medium ${activeTab === tab.id ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-primary'}`}
                        >
                           {tab.name}
                        </button>
                    ))}
                </div>
                <button onClick={() => setIsAdding(p => !p)} className="px-4 py-1.5 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover flex items-center gap-2">
                    <AddIcon className="h-4 w-4"/> Add Video
                </button>
            </div>
            
            {isAdding && (
                 <form onSubmit={handleAddVideo} className="bg-glass p-4 rounded-b-lg border border-t-0 border-border-color mb-6 space-y-3">
                    <input type="text" value={newVideoName} onChange={e => setNewVideoName(e.target.value)} placeholder="Video Name (e.g., 'Flow v2')" className="w-full bg-glass-light border border-border-color rounded-lg px-3 py-2 text-sm" required />
                    <input type="url" value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)} placeholder="Video URL (e.g., 'https://.../video.mp4')" className="w-full bg-glass-light border border-border-color rounded-lg px-3 py-2 text-sm" required />
                    <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1 bg-glass-light text-text-primary text-xs rounded-lg">Cancel</button>
                        <button type="submit" className="px-3 py-1 bg-primary text-background text-xs font-bold rounded-lg">Save Video</button>
                    </div>
                </form>
            )}

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVideos.map(videoAsset => (
                    <div key={videoAsset.id} className="group relative">
                        <Link 
                            to={`/feedback/${projectId}/video/${videoCollection.id}?videoAssetId=${videoAsset.id}`}
                            className="block aspect-video bg-glass rounded-lg border border-border-color overflow-hidden"
                        >
                            <video src={videoAsset.url} className="w-full h-full object-cover bg-black" />
                            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white p-4 text-center">
                                <p className="font-bold">{videoAsset.name}</p>
                                <p className="text-sm mt-2">View Feedback</p>
                            </div>
                        </Link>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteVideo(videoAsset.id); }} className="absolute -top-1 -right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-10">
                            <CancelIcon className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => handleToggleVideoApproval(videoAsset.id)}
                            className="absolute top-2 left-2 h-6 w-6 rounded-full flex items-center justify-center text-white ring-2 ring-background transition-all"
                            title={videoCollection.approvedVideoIds?.includes(videoAsset.id) ? 'Unapprove' : 'Approve'}
                        >
                             {videoCollection.approvedVideoIds?.includes(videoAsset.id) ? (
                                <div className="h-full w-full rounded-full bg-green-500 flex items-center justify-center">
                                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" /></svg>
                                </div>
                             ) : (
                                <div className="h-full w-full rounded-full bg-gray-500/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                     <CheckCircleIcon className="w-5 h-5 text-white/80"/>
                                </div>
                             )}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FeedbackVideoDetailPage;