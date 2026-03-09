import React from 'react';
import { HardDrive, Link2, ChevronLeft, ChevronRight } from 'lucide-react';

export type LibraryTab = 'files' | 'links';

interface LibrarySidebarProps {
  activeTab: LibraryTab;
  onTabChange: (tab: LibraryTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const TABS: { id: LibraryTab; label: string; Icon: typeof HardDrive }[] = [
  { id: 'files', label: 'Files', Icon: HardDrive },
  { id: 'links', label: 'Links', Icon: Link2 },
];

const LibrarySidebar: React.FC<LibrarySidebarProps> = ({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
}) => {
  return (
    <div
      className={`relative flex flex-col shrink-0 border-r border-border-color bg-background/50 h-full transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className={`flex items-center ${isCollapsed ? 'justify-center p-4' : 'justify-between p-6'}`}>
        {!isCollapsed && (
          <h2 className="text-xs font-bold text-text-secondary uppercase tracking-widest whitespace-nowrap truncate overflow-hidden">
            File Sources
          </h2>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-glass-light transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className={`flex flex-col gap-1.5 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              title={isCollapsed ? label : undefined}
              className={`flex items-center py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isCollapsed ? 'justify-center px-0' : 'px-3 gap-3'
              } ${
                isActive
                  ? 'bg-primary text-background shadow-md shadow-primary/20'
                  : 'text-text-secondary hover:bg-glass hover:text-text-primary'
              }`}
            >
              <Icon size={18} className="shrink-0" />
              {!isCollapsed && <span className="truncate">{label}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default LibrarySidebar;
