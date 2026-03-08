import React, { useState } from 'react';
import { DriveFile, formatRelativeTime, getFileCategory } from '../../types/drive';
import { useRecentFiles } from '../../hooks/useRecentFiles';

interface RecentFilesPanelProps {
  onSelectFile: (file: DriveFile) => void;
}

const categoryDot: Record<string, string> = {
  image:       'bg-blue-400',
  video:       'bg-purple-400',
  document:    'bg-red-400',
  spreadsheet: 'bg-green-400',
  archive:     'bg-yellow-400',
  other:       'bg-text-secondary',
};

/**
 * DES-87 — Collapsible "Recent Files" panel showing last 10 modified files.
 * Clicking a file invokes onSelectFile to open the MetadataSidebar.
 * Data is cached for 60s by useRecentFiles.
 */
const RecentFilesPanel: React.FC<RecentFilesPanelProps> = ({ onSelectFile }) => {
  const [open, setOpen] = useState(false);
  const { recentFiles, isLoading, error } = useRecentFiles();

  return (
    <div className="mb-3 rounded-xl bg-glass border border-border-color overflow-hidden shrink-0">
      {/* Header / toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-glass-light transition-colors"
      >
        <span className="flex items-center gap-2 font-medium text-text-primary">
          <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Recent Files
          {recentFiles.length > 0 && (
            <span className="text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">{recentFiles.length}</span>
          )}
        </span>
        <svg
          className={`w-4 h-4 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Content */}
      {open && (
        <div className="border-t border-border-color">
          {isLoading ? (
            <div className="flex items-center justify-center py-4 gap-2 text-text-secondary text-xs">
              <svg className="animate-spin w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Loading recent files…
            </div>
          ) : error ? (
            <p className="text-xs text-red-400 px-4 py-3">{error}</p>
          ) : recentFiles.length === 0 ? (
            <p className="text-xs text-text-secondary px-4 py-3">No recent files found.</p>
          ) : (
            <ul>
              {recentFiles.map(file => {
                const cat = getFileCategory(file.mimeType);
                const dot = categoryDot[cat] ?? 'bg-text-secondary';
                return (
                  <li key={file.id}>
                    <button
                      onClick={() => onSelectFile(file)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-glass-light transition-colors"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                      <span className="flex-1 text-xs text-text-primary truncate" title={file.name}>{file.name}</span>
                      <span className="text-[10px] text-text-secondary shrink-0">{formatRelativeTime(file.modifiedTime)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default RecentFilesPanel;
