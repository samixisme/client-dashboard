
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
            <h1 className="text-3xl font-bold text-text-primary">{brand ? `Feedback for ${brand.name}` : 'Feedback'}</h1>
            <p className="mt-2 text-text-secondary">Select a project to view its feedback items.</p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.length > 0 ? filteredProjects.map(project => (
                    <Link
                        key={project.id}
                        to={`/feedback/${project.id}`}
                        className="bg-glass p-6 rounded-lg shadow-md border border-border-color transition-all hover:shadow-lg hover:border-primary block"
                    >
                        <div className="flex items-center mb-4">
                            <div className="p-2 bg-primary/20 rounded-md">
                                <ProjectsIcon className="h-6 w-6 text-primary" />
                            </div>
                            <h2 className="ml-4 text-xl font-semibold text-text-primary">{project.name}</h2>
                        </div>
                        <p className="text-sm text-text-secondary">{project.description}</p>
                    </Link>
                )) : (
                    <p className="col-span-full text-center text-text-secondary py-10">No projects found for this brand.</p>
                )}
            </div>
        </div>
    );
};

export default FeedbackPage;
