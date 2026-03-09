import React, { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HardDrive, Link2 } from 'lucide-react';
import FilesPage from './FilesPage';
import LinksPage from './LinksPage';

type LibraryTab = 'files' | 'links';

const TABS: { id: LibraryTab; label: string; Icon: typeof HardDrive }[] = [
  { id: 'files', label: 'Files',  Icon: HardDrive },
  { id: 'links', label: 'Links',  Icon: Link2     },
];

const LibraryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab: LibraryTab =
    rawTab === 'files' || rawTab === 'links' ? rawTab : 'files';

  const handleTabChange = useCallback(
    (tab: LibraryTab) => {
      setSearchParams({ tab }, { replace: true });
    },
    [setSearchParams],
  );

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 mb-5 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Library</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Your files and saved links in one place
          </p>
        </div>

        {/* Tab switcher */}
        <div
          className="flex items-center bg-glass border border-border-color rounded-xl overflow-hidden shrink-0"
          role="tablist"
          aria-label="Library tabs"
        >
          {TABS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`library-panel-${id}`}
                id={`library-tab-${id}`}
                onClick={() => handleTabChange(id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-primary/10 text-primary border-r border-primary/20 last:border-r-0'
                    : 'text-text-secondary hover:text-text-primary hover:bg-glass-light border-r border-border-color last:border-r-0'
                }`}
              >
                <Icon size={14} className="shrink-0" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab panels ───────────────────────────────────────────────────────── */}
      <div
        id="library-panel-files"
        role="tabpanel"
        aria-labelledby="library-tab-files"
        className={`flex-1 min-h-0 ${activeTab === 'files' ? 'flex flex-col' : 'hidden'}`}
      >
        <FilesPage />
      </div>

      <div
        id="library-panel-links"
        role="tabpanel"
        aria-labelledby="library-tab-links"
        className={`flex-1 min-h-0 ${activeTab === 'links' ? 'flex flex-col' : 'hidden'}`}
      >
        <LinksPage />
      </div>

    </div>
  );
};

export default LibraryPage;
