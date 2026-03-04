import React, { useMemo } from 'react';
import { ProjectFile } from '../../types';

interface SourceFilterSidebarProps {
  files: ProjectFile[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const SOURCE_LABELS: Record<string, string> = {
  drive: 'Drive Files',
  task: 'Task Attachments',
  mockup: 'Feedback Mockups',
  video: 'Feedback Videos',
  link: 'External Links',
};

const SourceFilterSidebar: React.FC<SourceFilterSidebarProps> = ({
  files,
  activeFilter,
  onFilterChange,
}) => {
  // Compute counts per source natively
  const counts = useMemo(() => {
    const acc: Record<string, number> = {};
    files.forEach((file) => {
      acc[file.source] = (acc[file.source] || 0) + 1;
    });
    return acc;
  }, [files]);

  // Derive unique sources from files + standard list
  const availableSources = useMemo(() => {
    const sources = Array.from(new Set(files.map((f) => f.source))).sort();
    return sources;
  }, [files]);

  return (
    <div className="w-64 shrink-0 border-r border-border-color bg-background/50 p-6 hidden md:flex flex-col gap-6 h-full overflow-y-auto">
      <div>
        <h2 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4">
          File Sources
        </h2>
        <nav className="flex flex-col gap-1.5">
          <button
            onClick={() => onFilterChange('all')}
            className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${
              activeFilter === 'all'
                ? 'bg-primary text-background'
                : 'text-text-secondary hover:bg-glass hover:text-text-primary'
            }`}
          >
            <span>All Files</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-md ${
                activeFilter === 'all'
                  ? 'bg-background/20 text-background'
                  : 'bg-glass text-text-secondary'
              }`}
            >
              {files.length}
            </span>
          </button>

          {availableSources.map((source) => (
            <button
              key={source}
              onClick={() => onFilterChange(source)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${
                activeFilter === source
                  ? 'bg-primary text-background'
                  : 'text-text-secondary hover:bg-glass hover:text-text-primary'
              }`}
            >
              <span className="truncate pr-2">
                {SOURCE_LABELS[source] || source.replace('_', ' ')}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-md ${
                  activeFilter === source
                    ? 'bg-background/20 text-background'
                    : 'bg-glass text-text-secondary'
                }`}
              >
                {counts[source] || 0}
              </span>
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto pt-6 border-t border-glass">
         <p className="text-xs text-text-secondary/60 text-center leading-relaxed">
           Select a source to filter your view. You can drag and drop onto this page to upload directly to Drive.
         </p>
      </div>
    </div>
  );
};

export default SourceFilterSidebar;
