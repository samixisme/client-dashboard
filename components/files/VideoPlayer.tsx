import React, { useEffect } from 'react';
import { DriveFile, formatFileSize } from '../../types/drive';
import { X } from 'lucide-react';
import ReactPlayer from 'react-player';

interface VideoPlayerProps {
  file: DriveFile;
  onClose: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ file, onClose }) => {
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

  const videoUrl = file.webContentLink || file.webViewLink || '';

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

      <div className="flex-1 w-full max-w-5xl mx-auto p-4 flex items-center justify-center" onClick={e => e.stopPropagation()}>
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-border-color">
          {videoUrl ? (
            <ReactPlayer 
              // @ts-ignore - react-player type bindings require missing @types/react-player
              url={videoUrl}
              controls
              width="100%"
              height="100%"
              playing={true}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-text-secondary">
              Video stream not available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
