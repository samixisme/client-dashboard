import React from 'react';
import { DriveFile } from '../../types/drive';
import FileCard from './FileCard';

interface GalleryViewProps {
  files: DriveFile[];
  onDelete: (fileId: string) => Promise<void>;
  onSelect: (file: DriveFile | null) => void;
}

export default function GalleryView({ files, onDelete, onSelect }: GalleryViewProps) {
  return (
    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 pb-4">
      {files.map(file => (
        <div key={file.id} className="break-inside-avoid mb-4">
          <FileCard 
            file={file} 
            viewMode="gallery" 
            onDelete={onDelete} 
            onClick={() => onSelect(file)} 
          />
        </div>
      ))}
    </div>
  );
}
