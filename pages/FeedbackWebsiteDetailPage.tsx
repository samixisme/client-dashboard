import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { FeedbackWebsite, WebsitePage } from '../types';
import { AddIcon } from '../components/icons/AddIcon';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { CancelIcon } from '../components/icons/CancelIcon';

const FeedbackWebsiteDetailPage = () => {
    const { projectId, websiteId } = useParams<{ projectId: string; websiteId: string }>();
    const navigate = useNavigate();
    const { data, forceUpdate } = useData();
    
    const website = useMemo(() => data.feedbackWebsites.find(m => m.id === websiteId), [data.feedbackWebsites, websiteId]);
    
    const [activeTab, setActiveTab] = useState<'all' | 'approved' | 'unapproved'>('all');
    const [description, setDescription] = useState(website?.description || '');
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [isAddingPage, setIsAddingPage] = useState(false);
    const [newPageName, setNewPageName] = useState('');
    const [newPagePath, setNewPagePath] = useState('');


    const handleSaveDescription = () => {
        if (website) {
            website.description = description;
            forceUpdate();
            setIsEditingDesc(false);
        }
    };
    
    const handleAddPage = (e: React.FormEvent) => {
        e.preventDefault();
        if (website && newPageName.trim() && newPagePath.trim()) {
            const newPage: WebsitePage = {
                id: `page-${Date.now()}`,
                name: newPageName,
                path: newPagePath.startsWith('/') ? newPagePath : `/${newPagePath}`,
            };
            if (!website.pages) website.pages = [];
            website.pages.push(newPage);
            forceUpdate();
            setIsAddingPage(false);
            setNewPageName('');
            setNewPagePath('');
        }
    };

    const handleDeletePage = (pageId: string) => {
        if (website && window.confirm('Are you sure you want to delete this page?')) {
            website.pages = website.pages?.filter(p => p.id !== pageId);
            // Also delete comments for this page
            data.feedbackComments = data.feedbackComments.filter(c => !(c.targetId === websiteId && c.pageUrl === website.pages?.find(p => p.id === pageId)?.path));
            forceUpdate();
        }
    };

    const handleDeleteCollection = () => {
        if (website && window.confirm('Are you sure you want to delete this entire website collection and all its comments?')) {
            data.feedbackComments = data.feedbackComments.filter(c => c.targetId !== websiteId);
            const index = data.feedbackWebsites.findIndex(w => w.id === websiteId);
            if (index > -1) {
                data.feedbackWebsites.splice(index, 1);
            }
            forceUpdate();
            navigate(`/feedback/${projectId}`);
        }
    };

    const handleTogglePageApproval = (pageId: string) => {
        if (website) {
            if (!website.approvedPageIds) website.approvedPageIds = [];
            
            if (website.approvedPageIds.includes(pageId)) {
                website.approvedPageIds = website.approvedPageIds.filter(id => id !== pageId);
            } else {
                website.approvedPageIds.push(pageId);
            }
            forceUpdate();
        }
    };

    const filteredPages = useMemo(() => {
        if (!website || !website.pages) return [];
        switch (activeTab) {
            case 'approved':
                return website.pages.filter(p => website.approvedPageIds?.includes(p.id));
            case 'unapproved':
                return website.pages.filter(p => !website.approvedPageIds?.includes(p.id));
            case 'all':
            default:
                return website.pages;
        }
    }, [website, activeTab]);

    if (!website) {
        return <div className="text-center p-10">Website not found.</div>;
    }

    const tabs = [
        { id: 'all', name: 'All' },
        { id: 'approved', name: 'Approved' },
        { id: 'unapproved', name: 'Unapproved' },
    ];

    return (
        <div>
            <h1 className="text-3xl font-bold text-text-primary">{website.name}</h1>
            
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
                <button onClick={() => setIsAddingPage(p => !p)} className="px-4 py-1.5 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover flex items-center gap-2">
                    <AddIcon className="h-4 w-4"/> Add Page
                </button>
            </div>

            {isAddingPage && (
                 <form onSubmit={handleAddPage} className="bg-glass p-4 rounded-b-lg border border-t-0 border-border-color mb-6 space-y-3">
                    <input type="text" value={newPageName} onChange={e => setNewPageName(e.target.value)} placeholder="Page Name (e.g., 'About Us')" className="w-full bg-glass-light border border-border-color rounded-lg px-3 py-2 text-sm" required />
                    <input type="text" value={newPagePath} onChange={e => setNewPagePath(e.target.value)} placeholder="URL Path (e.g., '/about')" className="w-full bg-glass-light border border-border-color rounded-lg px-3 py-2 text-sm" required />
                    <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setIsAddingPage(false)} className="px-3 py-1 bg-glass-light text-text-primary text-xs rounded-lg">Cancel</button>
                        <button type="submit" className="px-3 py-1 bg-primary text-background text-xs font-bold rounded-lg">Save Page</button>
                    </div>
                </form>
            )}

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredPages.map((page) => (
                    <div key={page.id} className="group relative">
                        <Link 
                            to={`/feedback/${projectId}/website/${websiteId}?pagePath=${page.path}`}
                            className="block aspect-video bg-glass rounded-lg border border-border-color overflow-hidden"
                        >
                            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                                <p className="font-bold text-text-primary">{page.name}</p>
                                <p className="text-xs font-mono text-text-secondary mt-1">{page.path}</p>
                            </div>
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white font-bold">View Feedback</span>
                            </div>
                        </Link>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeletePage(page.id); }} className="absolute -top-1 -right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-10">
                            <CancelIcon className="w-4 h-4" />
                        </button>
                         <button 
                            onClick={() => handleTogglePageApproval(page.id)}
                            className="absolute top-2 left-2 h-6 w-6 rounded-full flex items-center justify-center text-white ring-2 ring-background transition-all"
                            title={website.approvedPageIds?.includes(page.id) ? 'Unapprove' : 'Approve'}
                        >
                             {website.approvedPageIds?.includes(page.id) && (
                                <div className="h-full w-full rounded-full bg-green-500 flex items-center justify-center">
                                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" /></svg>
                                </div>
                             )}
                              {!website.approvedPageIds?.includes(page.id) && (
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

export default FeedbackWebsiteDetailPage;