import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { FeedbackMockup, MockupImage } from '../types';
import { AddIcon } from '../components/icons/AddIcon';
import { CancelIcon } from '../components/icons/CancelIcon';

const FeedbackMockupDetailPage = () => {
    const { projectId, mockupId } = useParams<{ projectId: string; mockupId: string }>();
    const navigate = useNavigate();
    const { data, forceUpdate } = useData();
    
    const mockup = useMemo(() => data.feedbackMockups.find(m => m.id === mockupId), [data.feedbackMockups, mockupId]);
    
    const [activeTab, setActiveTab] = useState<'all' | 'approved' | 'unapproved'>('all');
    const [description, setDescription] = useState(mockup?.description || '');
    const [isEditingDesc, setIsEditingDesc] = useState(false);

    // State for adding a new image
    const [isAdding, setIsAdding] = useState(false);
    const [newImageName, setNewImageName] = useState('');
    const [newImageUrl, setNewImageUrl] = useState('');


    const handleSaveDescription = () => {
        if (mockup) {
            mockup.description = description;
            forceUpdate();
            setIsEditingDesc(false);
        }
    };

    const handleAddImage = (e: React.FormEvent) => {
        e.preventDefault();
        if (mockup && newImageName.trim() && newImageUrl.trim()) {
            const newImage: MockupImage = {
                id: `img-${Date.now()}`,
                name: newImageName,
                url: newImageUrl,
            };
            mockup.images.push(newImage);
            forceUpdate();
            setIsAdding(false);
            setNewImageName('');
            setNewImageUrl('');
        }
    };

    const handleDeleteImage = (imageId: string) => {
        if (mockup && window.confirm('Are you sure you want to delete this image?')) {
            mockup.images = mockup.images.filter(img => img.id !== imageId);
            // Also delete comments associated with this image
            data.feedbackComments = data.feedbackComments.filter(c => c.imageId !== imageId);
            forceUpdate();
        }
    };

    const handleDeleteCollection = () => {
        if (mockup && window.confirm('Are you sure you want to delete this entire mockup collection and all its comments?')) {
            // Delete comments associated with this mockup
            data.feedbackComments = data.feedbackComments.filter(c => c.targetId !== mockupId);

            // Delete the mockup collection
            const index = data.feedbackMockups.findIndex(m => m.id === mockupId);
            if (index > -1) {
                data.feedbackMockups.splice(index, 1);
            }
            
            forceUpdate();
            navigate(`/feedback/${projectId}`);
        }
    };
    
    const filteredImages = useMemo(() => {
        if (!mockup) return [];
        switch (activeTab) {
            case 'approved':
                return mockup.images.filter(img => mockup.approvedImageIds?.includes(img.id));
            case 'unapproved':
                return mockup.images.filter(img => !mockup.approvedImageIds?.includes(img.id));
            case 'all':
            default:
                return mockup.images;
        }
    }, [mockup, activeTab]);

    if (!mockup) {
        return <div className="text-center p-10">Mockup not found.</div>;
    }

    const tabs = [
        { id: 'all', name: 'All' },
        { id: 'approved', name: 'Approved' },
        { id: 'unapproved', name: 'Unapproved' },
    ];

    return (
        <div>
            <h1 className="text-3xl font-bold text-text-primary">{mockup.name}</h1>
            
            <div className="mt-4 bg-glass p-6 rounded-lg border border-border-color">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-semibold text-text-primary">Introduction or Description</h2>
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
                    <AddIcon className="h-4 w-4"/> Add Image
                </button>
            </div>

            {isAdding && (
                 <form onSubmit={handleAddImage} className="bg-glass p-4 rounded-b-lg border border-t-0 border-border-color mb-6 space-y-3">
                    <input type="text" value={newImageName} onChange={e => setNewImageName(e.target.value)} placeholder="Image Name (e.g., 'Homepage v1')" className="w-full bg-glass-light border border-border-color rounded-lg px-3 py-2 text-sm" required />
                    <input type="url" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} placeholder="Image URL (e.g., 'https://.../image.png')" className="w-full bg-glass-light border border-border-color rounded-lg px-3 py-2 text-sm" required />
                    <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1 bg-glass-light text-text-primary text-xs rounded-lg">Cancel</button>
                        <button type="submit" className="px-3 py-1 bg-primary text-background text-xs font-bold rounded-lg">Save Image</button>
                    </div>
                </form>
            )}

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredImages.map((image, index) => (
                    <div key={image.id} className="group relative">
                        <Link 
                            to={`/feedback/${projectId}/mockup/${mockupId}?imageId=${image.id}`}
                            className="block aspect-square bg-glass rounded-lg border border-border-color overflow-hidden"
                        >
                            <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white font-bold">View Feedback</span>
                            </div>
                        </Link>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteImage(image.id); }} className="absolute -top-1 -right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-10">
                            <CancelIcon className="w-4 h-4" />
                        </button>
                        {mockup.approvedImageIds?.includes(image.id) && (
                            <div className="absolute top-2 left-2 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center text-white ring-2 ring-background">
                                 <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" /></svg>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FeedbackMockupDetailPage;