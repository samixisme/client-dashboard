import React, { useState } from 'react';
import { HardDrive, Link2, ChevronDown, ChevronUp, Clock, Star, FolderOpen } from 'lucide-react';

// ── Updated LibraryTab type (DES-131 / DES-160) ─────────────────────────────
export type LibraryTab = 'files.all' | 'files.recent' | 'files.starred' | 'links';

interface LibrarySidebarProps {
  activeTab: LibraryTab;
  onTabChange: (tab: LibraryTab) => void;
}

// ── Sub-items under the Drive Files accordion ─────────────────────────────────
const FILE_SUB_ITEMS: { id: LibraryTab; label: string; Icon: typeof FolderOpen }[] = [
  { id: 'files.all',     label: 'All Files', Icon: FolderOpen },
  { id: 'files.recent',  label: 'Recent',    Icon: Clock },
  { id: 'files.starred', label: 'Starred',   Icon: Star },
];

const LibrarySidebar: React.FC<LibrarySidebarProps> = ({
  activeTab,
  onTabChange,
}) => {
  // Drive Files accordion starts expanded when any file sub-tab is active
  const [isDriveExpanded, setIsDriveExpanded] = useState(true);

  const isAnyFileSubActive = activeTab.startsWith('files.');

  return (
    <div className="flex flex-col shrink-0 w-56 border-r border-border-color bg-background/50 h-full">
      {/* Header */}
      <div className="p-5 pb-3">
        <h2 className="text-xs font-bold text-text-secondary uppercase tracking-widest">
          File Sources
        </h2>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 px-3">
        {/* ── Drive Files Accordion ──────────────────────────────────────── */}
        <button
          onClick={() => setIsDriveExpanded(prev => !prev)}
          className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            isAnyFileSubActive
              ? 'text-primary'
              : 'text-text-secondary hover:bg-glass hover:text-text-primary'
          }`}
        >
          <span className="flex items-center gap-3">
            <HardDrive size={18} className="shrink-0" />
            <span>Drive Files</span>
          </span>
          {isDriveExpanded ? (
            <ChevronUp size={16} className="shrink-0 text-text-secondary" />
          ) : (
            <ChevronDown size={16} className="shrink-0 text-text-secondary" />
          )}
        </button>

        {/* Sub-items (DES-158, DES-165) */}
        {isDriveExpanded && (
          <div className="flex flex-col gap-0.5 ml-3 pl-3 border-l border-border-color">
            {FILE_SUB_ITEMS.map(({ id, label, Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => onTabChange(id)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-background shadow-sm shadow-primary/20 -ml-3 pl-3 border-l-2 border-primary'
                      : 'text-text-secondary hover:bg-glass hover:text-text-primary'
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Linkwarden (direct navigation) ─────────────────────────────── */}
        <button
          onClick={() => onTabChange('links')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mt-1 ${
            activeTab === 'links'
              ? 'bg-primary text-background shadow-md shadow-primary/20'
              : 'text-text-secondary hover:bg-glass hover:text-text-primary'
          }`}
        >
          <Link2 size={18} className="shrink-0" />
          <span>Linkwarden</span>
        </button>
      </nav>
    </div>
  );
};

export default LibrarySidebar;
