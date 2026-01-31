
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
                    {project?.name} Mockups
                </h1>
                <p className="mt-2 text-text-secondary/90 font-medium">
                    Review and manage all mockup feedback requests.
                </p>
            </div>

            <div className="mt-8">
                {loading ? (
                    <div className="text-center py-10 text-text-secondary">Loading mockups...</div>
                ) : mockups.length === 0 ? (
                    <div className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-xl animate-fade-in">
                        <div className="w-20 h-20 rounded-full bg-primary/10 backdrop-blur-sm flex items-center justify-center mb-6 border border-primary/20">
                            <MockupIcon className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-text-primary mb-2">No Mockups Yet</h3>
                        <p className="text-text-secondary/90 max-w-md">
                            Create a new mockup feedback request from the main project feedback page.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {mockups.map((mockup, index) => (
                            <Link
                                key={mockup.id}
                                to={`/feedback/${projectId}/mockup/${mockup.id}`}
                                className="bg-glass/40 backdrop-blur-xl rounded-2xl border border-border-color overflow-hidden hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:scale-[1.03] hover:bg-glass/60 transition-all duration-500 cursor-pointer group animate-fade-in-up relative block"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {/* Gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                <div className="aspect-video bg-glass-light relative overflow-hidden flex items-center justify-center">
                                    <img
                                        src={mockup.assetUrl}
                                        alt={mockup.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                        <span className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-xl shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                            View Feedback
                                        </span>
                                    </div>

                                    {/* Enhanced status badge */}
                                    <div className={`absolute top-2 right-2 px-2.5 py-1 rounded-lg text-xs font-semibold border backdrop-blur-sm shadow-sm transition-all duration-300 ${
                                        mockup.status === 'approved'
                                            ? 'bg-green-500/20 text-green-300 border-green-500/30'
                                            : mockup.status === 'changes_requested'
                                            ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                            : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                                    }`}>
                                        {mockup.status.replace('_', ' ')}
                                    </div>
                                </div>

                                <div className="p-5 relative z-10">
                                    <h3 className="text-lg font-bold text-text-primary mb-2 group-hover:text-primary transition-colors duration-300">
                                        {mockup.name}
                                    </h3>
                                    <p className="text-sm text-text-secondary/90 line-clamp-2 mb-4">
                                        {mockup.description}
                                    </p>
                                    <div className="flex justify-between items-center text-xs text-text-secondary/80 pt-3 border-t border-border-color/30">
                                        <span className="font-medium">{new Date(mockup.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                                        <span className="font-medium">{mockup.commentCount || 0} Comments</span>
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
