import React, { useEffect } from 'react';
import { DriveFile, formatFileSize } from '../../types/drive';
import { X } from 'lucide-react';

interface ImageLightboxProps {
  file: DriveFile;
  onClose: () => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ file, onClose }) => {
  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Drive API thumbnailLink often limits dimensions by adding parameters like "=s220"
  // E.g. "https://lh3.googleusercontent.com/...=s220". We can strip it to get full size if webContentLink fails.
  const imageUrl = file.webContentLink || file.thumbnailLink?.replace(/=s\d+$/, '') || file.thumbnailLink;

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col bg-background/90 backdrop-blur-xl"
      onClick={onClose}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-glass border-b border-border-color" onClick={e => e.stopPropagation()}>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
          <p className="text-xs text-text-secondary">{formatFileSize(file.size)}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-glass-light transition-colors text-text-secondary hover:text-text-primary"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image Container */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0 overflow-hidden">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={file.name}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <p className="text-text-secondary">No image URL available.</p>
        )}
      </div>
    </div>
  );
};

export default ImageLightbox;
