import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

const AdminLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background decorations specifically for admin to distinguish it */}
        <div className="absolute top-0 right-0 -mr-40 -mt-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-purple-500/5 blur-3xl pointer-events-none"></div>
        
        <AdminHeader />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background/50 p-6 md:p-10 relative z-0 scrollbar-thin scrollbar-thumb-glass-heavy scrollbar-track-transparent">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
