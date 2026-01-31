
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
                    {project?.name} Websites
                </h1>
                <p className="mt-2 text-text-secondary/90 font-medium">
                    Review and manage all website feedback requests.
                </p>
            </div>

            <div className="mt-8">
                {loading ? (
                    <div className="text-center py-10 text-text-secondary">Loading websites...</div>
                ) : websites.length === 0 ? (
                    <div className="bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-xl animate-fade-in">
                        <div className="w-20 h-20 rounded-full bg-primary/10 backdrop-blur-sm flex items-center justify-center mb-6 border border-primary/20">
                            <WebsiteIcon className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-text-primary mb-2">No Websites Yet</h3>
                        <p className="text-text-secondary/90 max-w-md">
                            Create a new website feedback request from the main project feedback page.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {websites.map((website, index) => (
                            <Link
                                key={website.id}
                                to={`/feedback/${projectId}/website/${website.id}`}
                                className="bg-glass/40 backdrop-blur-xl rounded-2xl border border-border-color overflow-hidden hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:scale-[1.03] hover:bg-glass/60 transition-all duration-500 cursor-pointer group animate-fade-in-up relative block flex flex-col"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {/* Gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                <div className="h-40 bg-glass-light border-b border-border-color/30 flex items-center justify-center relative">
                                    <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                        <WebsiteIcon className="w-8 h-8 text-primary"/>
                                    </div>

                                    {/* Enhanced status badge */}
                                    <div className={`absolute top-2 right-2 px-2.5 py-1 rounded-lg text-xs font-semibold border backdrop-blur-sm shadow-sm transition-all duration-300 ${
                                        website.status === 'approved'
                                            ? 'bg-green-500/20 text-green-300 border-green-500/30'
                                            : website.status === 'changes_requested'
                                            ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                            : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                                    }`}>
                                        {website.status.replace('_', ' ')}
                                    </div>
                                </div>

                                <div className="p-5 flex-1 flex flex-col relative z-10">
                                    <h3 className="text-lg font-bold text-text-primary mb-2 group-hover:text-primary transition-colors duration-300">
                                        {website.name}
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs text-primary/80 mb-3 truncate">
                                        <LinkIcon className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate hover:underline font-medium">{website.assetUrl}</span>
                                    </div>
                                    <p className="text-sm text-text-secondary/90 line-clamp-2 mb-4 flex-1">
                                        {website.description}
                                    </p>
                                    <div className="pt-3 border-t border-border-color/30 flex justify-between items-center text-xs text-text-secondary/80">
                                        <span className="font-medium">{new Date(website.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                                        <span className="font-medium">{website.commentCount || 0} Comments</span>
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
