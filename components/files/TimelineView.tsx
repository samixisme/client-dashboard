import React from 'react';
import { DriveFile } from '../../types/drive';
import FileCard from './FileCard';
import { isToday, isThisWeek, isThisMonth } from 'date-fns';

interface TimelineViewProps {
  files: DriveFile[];
  onDelete: (fileId: string) => Promise<void>;
  onSelect: (file: DriveFile | null) => void;
}

export default function TimelineView({ files, onDelete, onSelect }: TimelineViewProps) {
  // Group by relative date bucket
  const buckets: Record<string, DriveFile[]> = {
    'Today': [],
    'This Week': [],
    'This Month': [],
    'Older': [],
  };

  files.forEach(file => {
    if (!file.modifiedTime) {
      buckets['Older'].push(file);
      return;
    }
    const t = new Date(file.modifiedTime);
    if (isToday(t)) {
      buckets['Today'].push(file);
    } else if (isThisWeek(t)) {
      buckets['This Week'].push(file);
    } else if (isThisMonth(t)) {
      buckets['This Month'].push(file);
    } else {
      buckets['Older'].push(file);
    }
  });

  return (
    <div className="pb-4 relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border-color/40" />
      {Object.entries(buckets).filter(([, f]) => f.length > 0).map(([label, group], idx) => (
        <div 
          key={label} 
          className="mb-8 relative animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
          style={{ animationDelay: `${idx * 100}ms` }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-primary ring-4 ring-background shrink-0 relative z-10 ml-2.5" />
            <h3 className="text-sm font-semibold text-text-primary capitalize tracking-wider">{label}</h3>
            <span className="text-xs font-medium text-text-secondary bg-glass-light px-2 py-0.5 rounded-full">
              {group.length}
            </span>
          </div>
          <div className="ml-8 flex flex-col gap-2">
            {group.map(file => (
              <FileCard 
                key={file.id} 
                file={file} 
                viewMode="list" 
                onDelete={onDelete} 
                onClick={() => onSelect(file)} 
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
