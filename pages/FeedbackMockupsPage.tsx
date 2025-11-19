
import React from 'react';
import { useParams } from 'react-router-dom';
import FeedbackMockupsView from '../components/feedback/FeedbackMockupsView';
import { useData } from '../contexts/DataContext';

const FeedbackMockupsPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { data } = useData();
    const project = data.projects.find(p => p.id === projectId);

    return (
        <div>
            <h1 className="text-3xl font-bold text-text-primary">Mockup Collections for {project?.name}</h1>
            <p className="mt-2 text-text-secondary">Review and manage all mockup feedback collections for this project.</p>
            <div className="mt-6">
                <FeedbackMockupsView projectId={projectId!} />
            </div>
        </div>
    );
};

export default FeedbackMockupsPage;
