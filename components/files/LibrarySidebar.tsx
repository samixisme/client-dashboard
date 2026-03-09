import React, { useState } from 'react';
import { HardDrive, Link2, Clock, Star, FolderOpen } from 'lucide-react';

// ── Updated LibraryTab type (DES-131 / DES-160) ─────────────────────────────
export type LibraryTab = 'files.all' | 'files.recent' | 'files.starred' | 'links';

interface LibrarySidebarProps {
  activeTab: LibraryTab;
  onTabChange: (tab: LibraryTab) => void;
}

// ── Nav items: each gets an icon and tooltip label ───────────────────────────
const NAV_ITEMS: { id: LibraryTab; label: string; Icon: typeof FolderOpen }[] = [
  { id: 'files.all',     label: 'All Files',   Icon: HardDrive },
  { id: 'files.recent',  label: 'Recent',      Icon: Clock },
  { id: 'files.starred', label: 'Starred',     Icon: Star },
  { id: 'links',         label: 'Linkwarden',  Icon: Link2 },
];

const LibrarySidebar: React.FC<LibrarySidebarProps> = ({
  activeTab,
  onTabChange,
}) => {
  const [tooltip, setTooltip] = useState<LibraryTab | null>(null);

  return (
    <div className="flex flex-col items-center shrink-0 w-16 border-r border-border-color bg-background/60 h-full py-4 gap-2">
      {NAV_ITEMS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        return (
          <div key={id} className="relative flex items-center group">
            <button
              onClick={() => onTabChange(id)}
              onMouseEnter={() => setTooltip(id)}
              onMouseLeave={() => setTooltip(null)}
              aria-label={label}
              title={label}
              className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-primary text-background shadow-lg shadow-primary/30'
                  : 'text-text-secondary hover:bg-glass hover:text-text-primary'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
            </button>

            {/* Tooltip */}
            {tooltip === id && (
              <div className="absolute left-14 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
                <div className="flex items-center gap-1.5">
                  {/* Arrow */}
                  <div className="w-1.5 h-3 bg-glass border-l border-t border-b border-border-color clip-arrow" />
                  <div className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-glass/90 backdrop-blur-xl border border-border-color text-xs font-medium text-text-primary shadow-xl">
                    {label}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default LibrarySidebar;
