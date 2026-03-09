import React, { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import FilesPage from './FilesPage';
import LinksPage from './LinksPage';
import LibrarySidebar, { LibraryTab } from '../components/files/LibrarySidebar';

const LibraryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab: LibraryTab =
    rawTab === 'files' || rawTab === 'links' ? rawTab : 'files';

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleTabChange = useCallback(
    (tab: LibraryTab) => {
      setSearchParams({ tab }, { replace: true });
    },
    [setSearchParams],
  );

  const toggleCollapse = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* ── Collapsible Sidebar ── */}
      <LibrarySidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Optional: we can add a very small contextual breadcrumb right here if needed later, 
            but for now FilesPage/LinksPage bring their own headers inside the content pane. */}

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
          {activeTab === 'files' && <FilesPage />}
          {activeTab === 'links' && <LinksPage />}
        </div>
      </div>
    </div>
  );
};

export default LibraryPage;
