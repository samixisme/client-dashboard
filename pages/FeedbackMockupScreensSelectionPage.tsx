
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FeedbackItem } from '../types';
import { getFeedbackItem, updateFeedbackItemImages } from '../utils/feedbackUtils';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { AddIcon } from '../components/icons/AddIcon';
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';
import { MockupIcon } from '../components/icons/MockupIcon';

const FeedbackMockupScreensSelectionPage = () => {
    const { projectId, feedbackItemId } = useParams<{ projectId: string; feedbackItemId: string }>();
    const navigate = useNavigate();
    const [item, setItem] = useState<FeedbackItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'approved' | 'unapproved'>('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newImageName, setNewImageName] = useState('');
    const [newImageUrl, setNewImageUrl] = useState('');

    useEffect(() => {
        if (projectId && feedbackItemId) {
            getFeedbackItem(projectId, feedbackItemId).then(fetchedItem => {
                setItem(fetchedItem);
                setIsLoading(false);
            });
        }
    }, [projectId, feedbackItemId]);

    const filteredImages = item?.images?.filter(image => {
        if (filter === 'approved') return image.approved;
        if (filter === 'unapproved') return !image.approved;
        return true;
    }) || [];

    const handleAddImage = async () => {
        if (!newImageName || !newImageUrl || !item || !projectId || !feedbackItemId) return;
        
        const newImage = {
            id: `img-${Date.now()}`,
            name: newImageName,
            url: newImageUrl,
            approved: false
        };

        const updatedImages = [...(item.images || []), newImage];
        
        // Optimistic update
        const updatedItem = { ...item, images: updatedImages };
        setItem(updatedItem);
        setShowAddModal(false);
        setNewImageName('');
        setNewImageUrl('');

        await updateFeedbackItemImages(projectId, feedbackItemId, updatedImages);
    };

    if (isLoading) return <div className="h-screen w-full flex items-center justify-center text-text-primary">Loading...</div>;
    if (!item) return <div className="h-screen w-full flex items-center justify-center text-red-500">Item not found</div>;

    // Use main asset as default if no images
    const hasImages = item.images && item.images.length > 0;

    return (
        <div className="min-h-screen text-text-primary p-8">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                     <button onClick={() => navigate(`/feedback/${projectId}/mockups`)} className="p-2 bg-glass/40 backdrop-blur-sm hover:bg-glass/60 rounded-full transition-colors">
                        <ArrowLeftIcon className="w-5 h-5 text-text-secondary" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">{item.name}</h1>
                        <p className="text-text-secondary text-sm">Select a screen to view feedback</p>
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
                    Add Screen
                </button>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Default Main Screen if empty lists or include it? 
                   For now, let's treat the 'assetUrl' as the first screen if empty.
                */}
                {!hasImages && (
                    <div
                        onClick={() => navigate(`/feedback/${projectId}/mockup/${feedbackItemId}/view`)}
                        className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-xl overflow-hidden cursor-pointer hover:border-primary hover:bg-glass/60 transition-all group relative aspect-video flex flex-col shadow-sm hover:shadow-md"
                    >
                         <div className="relative flex-1 bg-black/20 overflow-hidden">
                            <img src={item.assetUrl} alt="Main Screen" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-glass/40 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                                {/* Empty for unapproved */}
                            </div>
                         </div>
                         <div className="p-4 bg-glass/40 backdrop-blur-xl border-t border-border-color">
                            <h3 className="font-bold text-lg group-hover:text-primary transition-colors">Main Screen</h3>
                            <p className="text-text-secondary text-xs truncate mt-1">Default Asset</p>
                         </div>
                    </div>
                )}

                {filteredImages.map(image => (
                    <div
                        key={image.id}
                        onClick={() => navigate(`/feedback/${projectId}/mockup/${feedbackItemId}/view?path=${encodeURIComponent(image.url)}`)}
                        className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-xl overflow-hidden cursor-pointer hover:border-primary hover:bg-glass/60 transition-all group relative aspect-video flex flex-col shadow-sm hover:shadow-md"
                    >
                         <div className="relative flex-1 bg-black/20 overflow-hidden">
                            <img src={image.url} alt={image.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute top-3 left-3">
                                {image.approved ? (
                                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-black shadow-lg">
                                        <CheckCircleIcon className="w-4 h-4" />
                                    </div>
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-glass/40 backdrop-blur-sm border border-white/20" />
                                )}
                            </div>
                         </div>
                         <div className="p-4 bg-glass/40 backdrop-blur-xl border-t border-border-color">
                            <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{image.name}</h3>
                            <p className="text-text-secondary text-xs truncate mt-1">{image.url}</p>
                         </div>
                    </div>
                ))}
            </div>

            {/* Add Image Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-border-color rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary/20 rounded-lg text-primary">
                                <MockupIcon className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold">Add New Screen</h2>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-text-secondary mb-1">Screen Name</label>
                                <input 
                                    type="text" 
                                    value={newImageName}
                                    onChange={e => setNewImageName(e.target.value)}
                                    placeholder="e.g. Login Screen"
                                    className="w-full bg-surface-light border border-border-color rounded-lg px-4 py-2 text-text-primary focus:border-primary outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-text-secondary mb-1">Image URL</label>
                                <input 
                                    type="text" 
                                    value={newImageUrl}
                                    onChange={e => setNewImageUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full bg-surface-light border border-border-color rounded-lg px-4 py-2 text-text-primary focus:border-primary outline-none font-mono text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button 
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 px-4 py-2 rounded-lg font-medium hover:bg-surface-light transition-colors text-text-secondary"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleAddImage}
                                disabled={!newImageName || !newImageUrl}
                                className="flex-1 bg-primary text-black px-4 py-2 rounded-lg font-bold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add Screen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeedbackMockupScreensSelectionPage;
