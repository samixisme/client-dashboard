import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { useLenis } from '../../src/hooks/useLenis';
import { useGlobalSmoothScroll } from '../../src/hooks/useGlobalSmoothScroll';

const AdminLayout: React.FC = () => {
  const mainRef = useLenis<HTMLElement>();

  // Enable smooth scrolling on all nested scrollable elements
  useGlobalSmoothScroll();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-text-primary font-sans">
      {/* Admin Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Admin Header */}
        <AdminHeader />

        {/* Page Content */}
        <main ref={mainRef} className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-border-color scrollbar-track-transparent">
          <div className="max-w-7xl mx-auto h-full">
             <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
