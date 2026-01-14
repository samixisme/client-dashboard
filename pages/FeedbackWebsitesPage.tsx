
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { getFeedbackItems } from '../utils/feedbackUtils';
import { FeedbackItem } from '../types';
import { WebsiteIcon } from '../components/icons/WebsiteIcon';
import { LinkIcon } from '../components/icons/LinkIcon';

const FeedbackWebsitesPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { data } = useData();
    const project = data.projects.find(p => p.id === projectId);
    
    const [websites, setWebsites] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (projectId) {
            getFeedbackItems(projectId).then(items => {
                const websiteItems = items.filter(item => item.type === 'website');
                setWebsites(websiteItems);
                setLoading(false);
            });
        }
    }, [projectId]);

    return (
        <div>
            <h1 className="text-3xl font-bold text-text-primary">Website Feedback for {project?.name}</h1>
            <p className="mt-2 text-text-secondary">Review and manage all website feedback requests.</p>
            
            <div className="mt-8">
                {loading ? (
                    <div className="text-center py-10 text-text-secondary">Loading websites...</div>
                ) : websites.length === 0 ? (
                    <div className="bg-glass border border-border-color rounded-xl p-10 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-glass-light flex items-center justify-center mb-4">
                            <WebsiteIcon className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-text-primary">No Websites Yet</h3>
                        <p className="text-text-secondary max-w-md mt-2">
                            Create a new website feedback request from the main project feedback page.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {websites.map(website => (
                            <Link 
                                key={website.id} 
                                to={`/feedback/${projectId}/website/${website.id}`}
                                className="group bg-glass rounded-lg border border-border-color overflow-hidden hover:border-primary transition-all shadow-sm hover:shadow-md block flex flex-col h-full"
                            >
                                <div className="h-40 bg-glass-light border-b border-border-color flex items-center justify-center relative">
                                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm">
                                        <WebsiteIcon className="w-8 h-8 text-primary"/>
                                    </div>
                                     <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold uppercase ${
                                        website.status === 'approved' ? 'bg-green-500 text-white' : 
                                        website.status === 'changes_requested' ? 'bg-red-500 text-white' : 
                                        'bg-yellow-500 text-white'
                                    }`}>
                                        {website.status.replace('_', ' ')}
                                    </div>
                                </div>
                                <div className="p-4 flex-1 flex flex-col">
                                    <h3 className="text-lg font-semibold text-text-primary mb-1 group-hover:text-primary transition-colors">{website.name}</h3>
                                    <div className="flex items-center gap-2 text-xs text-primary mb-2 truncate">
                                        <LinkIcon className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate hover:underline">{website.assetUrl}</span>
                                    </div>
                                    <p className="text-sm text-text-secondary line-clamp-2 mb-4 flex-1">{website.description}</p>
                                    <div className="pt-4 border-t border-border-color flex justify-between items-center text-xs text-text-secondary">
                                        <span>{new Date(website.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                                        <span>{website.commentCount || 0} Comments</span>
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

export default FeedbackWebsitesPage;
