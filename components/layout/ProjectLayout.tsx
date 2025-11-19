
import React from 'react';
import { Outlet } from 'react-router-dom';

const ProjectLayout: React.FC = () => {
    // This component now primarily acts as a route grouping component.
    // The shared header logic has been moved to MainLayout.
    return <Outlet />;
};

export default ProjectLayout;
