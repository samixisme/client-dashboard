
import React from 'react';
import { useParams } from 'react-router-dom';
import FeedbackWebsitesView from '../components/feedback/FeedbackWebsitesView';
import { useData } from '../contexts/DataContext';

const FeedbackWebsitesPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { data } = useData();
    const project = data.projects.find(p => p.id === projectId);

    return (
        <div>
            <h1 className="text-3xl font-bold text-text-primary">Website Collections for {project?.name}</h1>
            <p className="mt-2 text-text-secondary">Review and manage all website feedback collections for this project.</p>
            <div className="mt-6">
                <FeedbackWebsitesView projectId={projectId!} />
            </div>
        </div>
    );
};

export default FeedbackWebsitesPage;
