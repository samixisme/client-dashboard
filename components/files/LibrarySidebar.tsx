import React from 'react';
import { HardDrive, Link2, Clock, Star, FolderOpen } from 'lucide-react';

// ── Updated LibraryTab type (DES-131 / DES-160) ─────────────────────────────
export type LibraryTab = 'files.all' | 'files.recent' | 'files.starred' | 'links';

interface LibrarySidebarProps {
  activeTab: LibraryTab;
  onTabChange: (tab: LibraryTab) => void;
}

const NAV_ITEMS: { id: LibraryTab; label: string; Icon: typeof FolderOpen }[] = [
  { id: 'files.all',     label: 'All Files',  Icon: HardDrive },
  { id: 'files.recent',  label: 'Recent',     Icon: Clock },
  { id: 'files.starred', label: 'Starred',    Icon: Star },
  { id: 'links',         label: 'Linkwarden', Icon: Link2 },
];

/**
 * Renders a fixed horizontal pill at the bottom-center of the viewport,
 * at the same Y position as the sidebar settings button (bottom-6).
 * Each button uses the identical expand-on-hover animation as the main nav.
 */
const LibrarySidebar: React.FC<LibrarySidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 p-1.5 rounded-2xl bg-background/80 backdrop-blur-xl border border-border-color shadow-2xl no-print">
      {NAV_ITEMS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            aria-label={label}
            className={`group flex items-center h-11 w-11 hover:w-36 rounded-xl transition-all duration-300 ease-in-out overflow-hidden ${
              isActive
                ? 'bg-primary text-background font-bold'
                : 'bg-glass text-text-secondary hover:bg-glass-light hover:text-text-primary border border-border-color'
            }`}
          >
            {/* Fixed icon cell */}
            <div className="h-11 w-11 shrink-0 flex items-center justify-center">
              <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
            </div>
            {/* Sliding label */}
            <div className="whitespace-nowrap pr-4 pl-1">
              <span className="font-medium text-sm">{label}</span>
            </div>
          </button>
        );
      })}
    </nav>
  );
};

export default LibrarySidebar;
