import React from 'react';
import { DriveFolder } from '../../types/drive';

interface FolderGridProps {
  folders: DriveFolder[];
  onNavigate: (path: string) => void;
  currentPath: string;
}

const FolderGrid: React.FC<FolderGridProps> = ({ folders, onNavigate, currentPath }) => {
  if (folders.length === 0) return null;

  return (
    <div className="mb-6 shrink-0">
      <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-3">Folders</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {folders.map(folder => {
          const folderPath = currentPath ? `${currentPath}/${folder.name}` : folder.name;
          return (
            <button
              key={folder.id}
              onClick={() => onNavigate(folderPath)}
              onDoubleClick={() => onNavigate(folderPath)}
              className="flex items-center gap-3 p-3 rounded-xl bg-glass border border-border-color hover:border-primary/40 hover:bg-glass-light transition-all group text-left"
            >
              <svg className="w-5 h-5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
              <span className="text-sm font-medium text-text-primary truncate group-hover:text-primary transition-colors">
                {folder.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FolderGrid;
