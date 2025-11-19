
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Moodboard } from '../types';
import { MoodboardIcon } from '../components/icons/MoodboardIcon';
import AddMoodboardModal from '../components/moodboard/AddMoodboardModal';
import { AddIcon } from '../components/icons/AddIcon';

// FIX: Moved MoodboardCard outside of ProjectMoodboardsPage and used React.FC to fix typing issue with 'key' prop.
const MoodboardCard: React.FC<{ moodboard: Moodboard }> = ({ moodboard }) => {
    const { data } = useData();
    const itemCount = data.moodboardItems.filter(item => item.moodboardId === moodboard.id).length;

    return (
        <Link 
            to={`/moodboard/${moodboard.id}`}
            className="bg-glass p-6 rounded-lg shadow-md border border-border-color transition-all hover:shadow-lg hover:border-primary block"
        >
            <div className="flex items-center mb-4">
                <div className="p-2 bg-primary/20 rounded-md">
                    <MoodboardIcon className="h-6 w-6 text-primary" />
                </div>
                <h2 className="ml-4 text-xl font-semibold text-text-primary">{moodboard.name}</h2>
            </div>
            <p className="text-sm text-text-secondary">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
        </Link>
    );
};

const ProjectMoodboardsPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { data, forceUpdate } = useData();
    const project = data.projects.find(p => p.id === projectId);
    
    const moodboards = data.moodboards.filter(m => m.projectId === projectId);
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const handleCreateMoodboard = (name: string) => {
        if (name.trim() && projectId) {
            const newMoodboard: Moodboard = {
                id: `mood-${Date.now()}`,
                projectId,
                name,
            };
            data.moodboards.push(newMoodboard); // Persist to mock data
            forceUpdate();
            setIsAddModalOpen(false);
        }
    };

    if (!project) {
        return <div className="text-center p-10">Project not found.</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">{project.name} Moodboards</h1>
                    <p className="mt-2 text-text-secondary">Creative spaces for your project.</p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="px-4 py-2 bg-primary text-background text-sm font-bold rounded-lg hover:bg-primary-hover flex items-center gap-2">
                    <AddIcon className="h-4 w-4" /> Create New Moodboard
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {moodboards.map(moodboard => (
                    <MoodboardCard key={moodboard.id} moodboard={moodboard} />
                ))}
            </div>

            {isAddModalOpen && (
                <AddMoodboardModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onAdd={handleCreateMoodboard}
                />
            )}
        </div>
    );
};

export default ProjectMoodboardsPage;
