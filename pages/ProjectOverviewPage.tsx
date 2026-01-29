import React from 'react';
import { useParams } from 'react-router-dom';

const ProjectOverviewPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-bold text-text-primary mb-4">
                    Project Overview
                </h1>
                <p className="text-text-secondary">
                    Project ID: {projectId}
                </p>
                <div className="mt-8 p-8 bg-glass/40 backdrop-blur-xl rounded-2xl border border-border-color">
                    <p className="text-text-secondary text-center">
                        This page will be formatted later...
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProjectOverviewPage;
