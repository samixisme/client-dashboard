import React, { useEffect } from 'react';
import { X, ExternalLink, Download, Info } from 'lucide-react';
import { DriveFile } from '../../types/drive';
import FilePreview from './FilePreview';

interface PreviewModalProps {
  file: DriveFile;
  onClose: () => void;
  onShowInfo?: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ file, onClose, onShowInfo }) => {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 md:p-12">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal */}
      <div className="relative w-full h-full max-w-6xl max-h-[90vh] flex flex-col bg-background/90 border border-border-color shadow-2xl rounded-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-color bg-glass/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h3 className="text-sm font-semibold text-text-primary truncate" title={file.name}>
              {file.name}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onShowInfo && (
              <button
                onClick={onShowInfo}
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-glass-light rounded-lg transition-colors"
                title="File Info & Metadata"
              >
                <Info className="w-4 h-4" />
              </button>
            )}
            {file.webContentLink && (
              <a
                href={file.webContentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-text-secondary hover:text-primary hover:bg-glass-light rounded-lg transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
            {file.webViewLink && (
              <a
                href={file.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-text-secondary hover:text-primary hover:bg-glass-light rounded-lg transition-colors"
                title="Open in Drive"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <div className="w-px h-6 bg-border-color mx-1" />
            <button
              onClick={onClose}
              className="p-2 text-text-secondary hover:text-red-400 hover:bg-glass-light rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview content area */}
        <div className="flex-1 min-h-0 relative bg-black/20 flex flex-col">
           {/* Replace specific FilePreview styles with global styles optimized for full screen */}
           <div className="flex-1 w-full h-full [&>div]:rounded-none!">
              <FilePreview file={file} />
           </div>
        </div>
        
      </div>
    </div>
  );
};

export default PreviewModal;
