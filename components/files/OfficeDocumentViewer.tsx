import React, { useEffect } from 'react';
import { DriveFile, formatFileSize } from '../../types/drive';
import { X, FileText } from 'lucide-react';

interface OfficeDocumentViewerProps {
  file: DriveFile;
  onClose: () => void;
}

export const OfficeDocumentViewer: React.FC<OfficeDocumentViewerProps> = ({ file, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  // Use webViewLink if available since it often works seamlessly, otherwise fallback to generic viewer
  const viewerUrl = file.webViewLink || `https://docs.google.com/viewer?url=${encodeURIComponent(file.webContentLink || '')}&embedded=true`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/90 backdrop-blur-xl" onClick={onClose}>
      <div className="flex items-center justify-between p-4 bg-glass border-b border-border-color" onClick={e => e.stopPropagation()}>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
          <p className="text-xs text-text-secondary">{formatFileSize(file.size)}</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-glass-light transition-colors text-text-secondary hover:text-text-primary">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 w-full max-w-5xl mx-auto p-4" onClick={e => e.stopPropagation()}>
        <div className="relative w-full h-full bg-background rounded-xl overflow-hidden shadow-2xl border border-border-color">
          <iframe
            src={viewerUrl}
            className="w-full h-full border-0"
            title={`Office Viewer - ${file.name}`}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>
      </div>
    </div>
  );
};
