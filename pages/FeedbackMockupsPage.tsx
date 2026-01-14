
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { getFeedbackItems } from '../utils/feedbackUtils';
import { FeedbackItem } from '../types';
import { MockupIcon } from '../components/icons/MockupIcon';

const FeedbackMockupsPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { data } = useData();
    const project = data.projects.find(p => p.id === projectId);
    
    const [mockups, setMockups] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (projectId) {
            getFeedbackItems(projectId).then(items => {
                const mockupItems = items.filter(item => item.type === 'mockup');
                setMockups(mockupItems);
                setLoading(false);
            });
        }
    }, [projectId]);

    return (
        <div>
            <h1 className="text-3xl font-bold text-text-primary">Mockup Feedback for {project?.name}</h1>
            <p className="mt-2 text-text-secondary">Review and manage all mockup feedback requests.</p>
            
            <div className="mt-8">
                {loading ? (
                    <div className="text-center py-10 text-text-secondary">Loading mockups...</div>
                ) : mockups.length === 0 ? (
                    <div className="bg-glass border border-border-color rounded-xl p-10 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-glass-light flex items-center justify-center mb-4">
                            <MockupIcon className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-text-primary">No Mockups Yet</h3>
                        <p className="text-text-secondary max-w-md mt-2">
                            Create a new mockup feedback request from the main project feedback page.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {mockups.map(mockup => (
                            <Link 
                                key={mockup.id} 
                                to={`/feedback/${projectId}/mockup/${mockup.id}`}
                                className="group bg-glass rounded-lg border border-border-color overflow-hidden hover:border-primary transition-all shadow-sm hover:shadow-md block"
                            >
                                <div className="aspect-video bg-glass-light relative overflow-hidden flex items-center justify-center">
                                    <img src={mockup.assetUrl} alt={mockup.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">View Feedback</span>
                                    </div>
                                    <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold uppercase ${
                                        mockup.status === 'approved' ? 'bg-green-500 text-white' : 
                                        mockup.status === 'changes_requested' ? 'bg-red-500 text-white' : 
                                        'bg-yellow-500 text-white'
                                    }`}>
                                        {mockup.status.replace('_', ' ')}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="text-lg font-semibold text-text-primary mb-1 group-hover:text-primary transition-colors">{mockup.name}</h3>
                                    <p className="text-sm text-text-secondary line-clamp-2">{mockup.description}</p>
                                    <div className="mt-4 flex justify-between items-center text-xs text-text-secondary">
                                        <span>{new Date(mockup.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                                        <span>{mockup.commentCount || 0} Comments</span>
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

export default FeedbackMockupsPage;
