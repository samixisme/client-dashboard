import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FeedbackItem } from '../types';
import { getFeedbackItem, updateFeedbackItemPages } from '../utils/feedbackUtils';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { AddIcon } from '../components/icons/AddIcon';
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';

const FeedbackWebsitePagesSelectionPage = () => {
    const { projectId, feedbackItemId } = useParams<{ projectId: string; feedbackItemId: string }>();
    const navigate = useNavigate();
    const [item, setItem] = useState<FeedbackItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'approved' | 'unapproved'>('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newPageName, setNewPageName] = useState('');
    const [newPagePath, setNewPagePath] = useState('/');

    useEffect(() => {
        if (projectId && feedbackItemId) {
            getFeedbackItem(projectId, feedbackItemId).then(fetchedItem => {
                setItem(fetchedItem);
                setIsLoading(false);
            });
        }
    }, [projectId, feedbackItemId]);

    const filteredPages = item?.pages?.filter(page => {
        if (filter === 'approved') return page.approved;
        if (filter === 'unapproved') return !page.approved;
        return true;
    }) || [];

    const handleAddPage = async () => {
        if (!newPageName || !newPagePath || !item || !projectId || !feedbackItemId) return;
        
        const newPage = {
            id: `page-${Date.now()}`,
            name: newPageName,
            url: newPagePath,
            approved: false
        };

        const updatedPages = [...(item.pages || []), newPage];
        
        // Optimistic update
        const updatedItem = { ...item, pages: updatedPages };
        setItem(updatedItem);
        setShowAddModal(false);
        setNewPageName('');
        setNewPagePath('/');

        await updateFeedbackItemPages(projectId, feedbackItemId, updatedPages);
    };

    if (isLoading) return <div className="h-screen w-full flex items-center justify-center text-text-primary">Loading...</div>;
    if (!item) return <div className="h-screen w-full flex items-center justify-center text-red-500">Item not found</div>;

    return (
        <div className="min-h-screen text-text-primary p-8">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                     <button onClick={() => navigate(`/feedback/${projectId}/websites`)} className="p-2 bg-glass/40 backdrop-blur-sm hover:bg-glass/60 rounded-full transition-all duration-300 border border-border-color">
                        <ArrowLeftIcon className="w-5 h-5 text-text-secondary" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">{item.name}</h1>
                        <p className="text-text-secondary text-sm">Select a page to view feedback</p>
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
                    Add Page
                </button>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Default Home Page if empty */}
                {(!item.pages || item.pages.length === 0) && (
                    <div 
                        onClick={() => navigate(`/feedback/${projectId}/website/${feedbackItemId}/view?path=/`)}
                        className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-xl p-6 cursor-pointer hover:border-primary/60 hover:shadow-lg transition-all duration-300 group relative h-40 flex flex-col justify-center items-center text-center"
                    >
                         <div className="absolute top-4 left-4 w-6 h-6 rounded-full border border-border-color flex items-center justify-center">
                            {/* Empty circle for unapproved */}
                        </div>
                        <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">Home Page</h3>
                        <p className="text-text-secondary font-mono text-sm">/</p>
                    </div>
                )}

                {filteredPages.map(page => (
                    <div 
                        key={page.id}
                        onClick={() => navigate(`/feedback/${projectId}/website/${feedbackItemId}/view?path=${encodeURIComponent(page.url)}`)}
                        className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-xl p-6 cursor-pointer hover:border-primary/60 hover:shadow-lg transition-all duration-300 group relative h-40 flex flex-col justify-center items-center text-center"
                    >
                        <div className="absolute top-4 left-4">
                            {page.approved ? (
                                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-black">
                                    <CheckCircleIcon className="w-4 h-4" />
                                </div>
                            ) : (
                                <div className="w-6 h-6 rounded-full border border-border-color bg-glass-light/30 backdrop-blur-sm" />
                            )}
                        </div>
                        
                        <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">{page.name}</h3>
                        <p className="text-text-secondary font-mono text-sm">{page.url}</p>
                    </div>
                ))}
            </div>

            {/* Add Page Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">Add New Page</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-text-secondary mb-1">Page Name</label>
                                <input 
                                    type="text" 
                                    value={newPageName}
                                    onChange={e => setNewPageName(e.target.value)}
                                    placeholder="e.g. About Us"
                                    className="w-full bg-surface-light border border-border-color rounded-lg px-4 py-2 text-text-primary focus:border-primary outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-text-secondary mb-1">Page Path</label>
                                <input 
                                    type="text" 
                                    value={newPagePath}
                                    onChange={e => setNewPagePath(e.target.value)}
                                    placeholder="e.g. /about"
                                    className="w-full bg-surface-light border border-border-color rounded-lg px-4 py-2 text-text-primary focus:border-primary outline-none font-mono"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button 
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 px-4 py-2 rounded-lg font-medium hover:bg-surface-light transition-colors text-text-secondary"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleAddPage}
                                disabled={!newPageName || !newPagePath}
                                className="flex-1 bg-primary text-black px-4 py-2 rounded-lg font-bold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add Page
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeedbackWebsitePagesSelectionPage;
