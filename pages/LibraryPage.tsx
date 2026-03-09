import React, { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import FilesPage from './FilesPage';
import LinksPage from './LinksPage';
import LibrarySidebar, { LibraryTab } from '../components/files/LibrarySidebar';

const VALID_TABS: LibraryTab[] = ['files.all', 'files.recent', 'files.starred', 'links'];

const LibraryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab: LibraryTab =
    rawTab && VALID_TABS.includes(rawTab as LibraryTab)
      ? (rawTab as LibraryTab)
      : 'files.all';

  const handleTabChange = useCallback(
    (tab: LibraryTab) => {
      setSearchParams({ tab }, { replace: true });
    },
    [setSearchParams],
  );

  return (
    <div className="flex h-full overflow-hidden px-4 md:px-10 pt-4 pb-24 md:pb-10">
      {/* ── Sidebar (always visible, 224px) ── */}
      <LibrarySidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
          {activeTab === 'links' ? (
            <LinksPage />
          ) : (
            <FilesPage activeTab={activeTab} />
          )}
        </div>
      </div>
    </div>
  );
};

export default LibraryPage;
