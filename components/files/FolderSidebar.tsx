import React from 'react';
import { DriveFolder } from '../../types/drive';

interface FolderSidebarProps {
  folders: DriveFolder[];
  currentPath: string;
  onNavigate: (path: string) => void;
}

const PINNED_FOLDERS = [
  { label: 'All Files', path: '' },
  { label: 'Projects',  path: 'projects' },
  { label: 'Brands',    path: 'brands' },
  { label: 'General',   path: 'general' },
];

const FolderIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
  </svg>
);

const FolderSidebar: React.FC<FolderSidebarProps> = ({ folders, currentPath, onNavigate }) => {
  return (
    <aside className="w-44 flex-shrink-0 flex flex-col gap-1">
      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-2 mb-1">
        Quick Access
      </p>
      {PINNED_FOLDERS.map(({ label, path }) => (
        <button
          key={path}
          onClick={() => onNavigate(path)}
          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors ${
            currentPath === path
              ? 'bg-primary text-background font-medium'
              : 'text-text-secondary hover:bg-glass-light hover:text-text-primary'
          }`}
        >
          <FolderIcon className="w-4 h-4 flex-shrink-0" />
          {label}
        </button>
      ))}

      {folders.length > 0 && (
        <>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-2 mt-3 mb-1">
            Subfolders
          </p>
          {folders.map((folder) => {
            const folderPath = currentPath ? `${currentPath}/${folder.name}` : folder.name;
            return (
              <button
                key={folder.id}
                onClick={() => onNavigate(folderPath)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors ${
                  currentPath === folderPath
                    ? 'bg-primary text-background font-medium'
                    : 'text-text-secondary hover:bg-glass-light hover:text-text-primary'
                }`}
              >
                <FolderIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{folder.name}</span>
              </button>
            );
          })}
        </>
      )}
    </aside>
  );
};

export default FolderSidebar;
