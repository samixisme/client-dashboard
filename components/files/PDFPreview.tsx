import React, { useState } from 'react';
import { DriveFile } from '../../types/drive';
import { PDFViewer } from './PDFViewer';
import { FileText } from 'lucide-react';

interface PDFPreviewProps {
  file: DriveFile;
}

const PDFPreview: React.FC<PDFPreviewProps> = ({ file }) => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const hasThumbnail = !!file.thumbnailLink;

  return (
    <>
      <div 
        className="w-full h-full flex flex-col items-center justify-center bg-glass cursor-pointer hover:bg-primary/5 transition-colors group relative overflow-hidden"
        onClick={(e) => {
          e.stopPropagation();
          setIsViewerOpen(true);
        }}
      >
        {hasThumbnail ? (
          <img 
            src={file.thumbnailLink} 
            alt={`Preview of ${file.name}`}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-80"
          />
        ) : (
          <FileText className="w-10 h-10 text-red-400 opacity-80 group-hover:scale-110 transition-transform" />
        )}
        
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-background/80 text-text-secondary border border-border-color backdrop-blur-md">
          PDF
        </div>
      </div>

      {isViewerOpen && (
        <PDFViewer 
          file={file} 
          onClose={() => setIsViewerOpen(false)} 
        />
      )}
    </>
  );
};

export default PDFPreview;
