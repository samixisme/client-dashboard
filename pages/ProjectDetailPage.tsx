import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projects, boards } from '../data/mockData';
import { brands } from '../data/brandData';
import { BoardIcon } from '../components/icons/BoardIcon';
import { RoadmapIcon } from '../components/icons/RoadmapIcon';

const ProjectDetailPage = () => {
    const { projectId } = useParams();
    const project = projects.find(p => p.id === projectId);
    const brand = project ? brands.find(b => b.id === project.brandId) : undefined;
    const projectBoards = boards.filter(b => b.projectId === projectId);

    const [activeTab, setActiveTab] = useState('boards');

    if (!project) {
        return <div className="text-center p-10">Project not found.</div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-text-primary mt-1">{project.name}</h1>
            <p className="mt-2 text-text-secondary">{project.description}</p>

            <div className="mt-8 border-b border-border-color flex items-center gap-4">
                 <Link to={`/projects/${project.id}`} 
                    className={`py-2 px-4 text-sm font-medium ${activeTab === 'boards' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-primary'}`}
                    onClick={() => setActiveTab('boards')}>
                    Boards
                </Link>
                <Link to={`/projects/${project.id}/roadmap`} 
                    className={`py-2 px-4 text-sm font-medium text-text-secondary hover:text-text-primary`}>
                    Roadmap
                </Link>
            </div>
            
            <div className="mt-6">
                 <h2 className="text-2xl font-semibold text-text-primary">Boards</h2>
                 <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {projectBoards.map(board => (
                        <Link key={board.id} to={`/board/${board.id}`} className="bg-surface p-5 rounded-lg border border-border-color hover:border-primary transition-colors">
                            <div className="flex items-center">
                                <BoardIcon className="h-5 w-5 text-text-secondary" />
                                <span className="ml-3 font-medium text-text-primary">{board.name}</span>
                            </div>
                        </Link>
                    ))}
                 </div>
            </div>
        </div>
    );
};

export default ProjectDetailPage;