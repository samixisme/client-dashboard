
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
            `}</style>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProjects.length > 0 ? filteredProjects.map((project, index) => (
                    <Link
                        key={project.id}
                        to={`/feedback/${project.id}`}
                        className="bg-glass/40 backdrop-blur-xl p-6 rounded-2xl border border-border-color hover:border-primary/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:scale-[1.03] hover:bg-glass/60 transition-all duration-500 cursor-pointer group animate-fade-in-up relative overflow-hidden block"
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        {/* Subtle gradient overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                        <div className="flex items-center mb-4 relative z-10">
                            <div className="p-3 bg-glass-light/60 backdrop-blur-sm rounded-xl border border-border-color/50 group-hover:border-primary/40 group-hover:bg-primary/10 transition-all duration-300">
                                <ProjectsIcon className="h-6 w-6 text-primary" />
                            </div>
                            <h2 className="ml-4 text-xl font-bold text-text-primary group-hover:text-primary transition-colors duration-300">{project.name}</h2>
                        </div>
                        <p className="text-sm text-text-secondary/90 leading-relaxed relative z-10">{project.description}</p>
                    </Link>
                )) : (
                    <div className="col-span-full text-center py-16 animate-fade-in">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-glass-light/50 mb-4">
                            <ProjectsIcon className="w-8 h-8 text-text-secondary/50" />
                        </div>
                        <p className="text-text-secondary font-medium">No projects found{brand ? ` for ${brand.name}` : ''}.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FeedbackPage;
