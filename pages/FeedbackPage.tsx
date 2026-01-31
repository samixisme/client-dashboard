
import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { ProjectsIcon } from '../components/icons/ProjectsIcon';

const FeedbackPage = () => {
    const { data } = useData();
    const { projects, brands } = data;
    const [searchParams] = useSearchParams();
    const brandId = searchParams.get('brandId');
    const brand = brandId ? brands.find(b => b.id === brandId) : null;

    const filteredProjects = useMemo(() => {
        if (brandId) {
            return projects.filter(p => p.brandId === brandId);
        }
        return projects;
    }, [brandId, projects]);

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

                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
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

                .animate-slide-in-right {
                    animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }
            `}</style>

            {/* Enhanced Header */}
            <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
                <h1 className="text-4xl font-bold text-text-primary bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text mb-2">
                    Feedback Projects
                </h1>
                <p className="text-text-secondary/90 font-medium">
                    Select a project to view and manage feedback requests{brand ? ` for ${brand.name}` : ''}.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProjects.length > 0 ? filteredProjects.map((project, index) => (
                    <Link
                        key={project.id}
                        to={`/feedback/${project.id}`}
                        className="bg-glass/40 backdrop-blur-xl rounded-2xl border border-border-color overflow-hidden hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:scale-[1.03] hover:bg-glass/60 transition-all duration-500 cursor-pointer group animate-fade-in-up relative flex flex-col"
                        style={{ animationDelay: `${(index + 1) * 50}ms` }}
                    >
                        {/* Subtle gradient overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                        {/* Icon header with glass effect */}
                        <div className="h-32 bg-glass-light/30 backdrop-blur-sm border-b border-border-color/30 flex items-center justify-center relative">
                            <div className="w-16 h-16 rounded-full bg-primary/10 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 border border-primary/20">
                                <ProjectsIcon className="h-8 w-8 text-primary" />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 flex-1 flex flex-col relative z-10">
                            <h2 className="text-xl font-bold text-text-primary mb-2 group-hover:text-primary transition-colors duration-300">
                                {project.name}
                            </h2>
                            <p className="text-sm text-text-secondary/90 leading-relaxed line-clamp-3 flex-1">
                                {project.description}
                            </p>

                            {/* Footer with metadata */}
                            <div className="mt-4 pt-4 border-t border-border-color/30 flex justify-between items-center text-xs text-text-secondary/80">
                                <span className="font-medium flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                    </svg>
                                    Feedback Hub
                                </span>
                                <span className="font-medium flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                    </svg>
                                    Active
                                </span>
                            </div>
                        </div>
                    </Link>
                )) : (
                    <div className="col-span-full bg-glass/40 backdrop-blur-xl border border-border-color rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-xl animate-fade-in">
                        <div className="w-20 h-20 rounded-full bg-primary/10 backdrop-blur-sm flex items-center justify-center mb-6 border border-primary/20">
                            <ProjectsIcon className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-text-primary mb-2">No Projects Available</h3>
                        <p className="text-text-secondary/90 max-w-md font-medium">
                            {brand
                                ? `No projects found for ${brand.name}. Try selecting a different brand or create a new project.`
                                : 'Get started by creating your first project to manage feedback requests.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FeedbackPage;
