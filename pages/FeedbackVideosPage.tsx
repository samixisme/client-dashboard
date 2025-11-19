
import React from 'react';
import { useParams } from 'react-router-dom';
import FeedbackVideosView from '../components/feedback/FeedbackVideosView';
import { useData } from '../contexts/DataContext';

const FeedbackVideosPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { data } = useData();
    const project = data.projects.find(p => p.id === projectId);

    return (
        <div>
            <h1 className="text-3xl font-bold text-text-primary">Video Collections for {project?.name}</h1>
            <p className="mt-2 text-text-secondary">Review and manage all video feedback collections for this project.</p>
            <div className="mt-6">
                <FeedbackVideosView projectId={projectId!} />
            </div>
        </div>
    );
};

export default FeedbackVideosPage;
