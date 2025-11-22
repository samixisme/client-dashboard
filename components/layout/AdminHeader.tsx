import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { useAdmin } from '../../contexts/AdminContext';

const AdminHeader: React.FC = () => {
    const { toggleAdminMode } = useAdmin();

  return (
    <header className="bg-glass border-b border-border-color h-16 flex items-center justify-between px-6 flex-shrink-0 z-10 relative">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-text-primary">Admin CMS Dashboard</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <Link 
            to="/" 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-glass-light hover:text-text-primary transition-colors border border-transparent hover:border-border-color"
        >
            <ArrowLeftIcon className="h-4 w-4" />
            View Site
        </Link>
        <div className="h-8 w-px bg-border-color mx-1"></div>
        <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                 AD
             </div>
             <span className="text-sm font-medium text-text-primary hidden md:block">Administrator</span>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
