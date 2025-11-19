
import React from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { CodeIcon } from '../icons/CodeIcon';

const AdminModeToggle: React.FC = () => {
    const { isAdminMode, toggleAdminMode, userRole } = useAdmin();

    if (userRole !== 'admin') {
        return null;
    }

    return (
        <button
            onClick={toggleAdminMode}
            title="Toggle Admin Backend"
            className={`fixed bottom-6 right-6 z-50 h-11 w-11 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 transform hover:scale-110 no-print ${
                isAdminMode ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary-hover'
            }`}
        >
            <CodeIcon className="h-6 w-6 text-background" />
        </button>
    );
};

export default AdminModeToggle;