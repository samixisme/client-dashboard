import React, { useState } from 'react';
import { DriveFile } from '../../types/drive';
import { VideoPlayer } from './VideoPlayer';
import { PlayCircle } from 'lucide-react';

interface VideoPreviewProps {
  file: DriveFile;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({ file }) => {
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  return (
    <>
      <div 
        className="w-full h-full flex flex-col items-center justify-center bg-glass cursor-pointer hover:bg-primary/5 transition-colors group relative overflow-hidden"
        onClick={(e) => {
          e.stopPropagation();
          setIsPlayerOpen(true);
        }}
      >
        {file.thumbnailLink ? (
          <>
            <img 
              src={file.thumbnailLink} 
              alt={`Preview of ${file.name}`}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-70"
            />
            <PlayCircle className="absolute inset-0 m-auto w-12 h-12 text-white opacity-80 group-hover:scale-110 transition-transform drop-shadow-md" strokeWidth={1.5} />
          </>
        ) : (
          <PlayCircle className="w-10 h-10 text-purple-400 opacity-80 group-hover:scale-110 transition-transform" />
        )}

        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-background/80 text-text-secondary border border-border-color backdrop-blur-md">
          {file.mimeType.startsWith('video/') ? 'VIDEO' : 'MEDIA'}
        </div>
      </div>

      {isPlayerOpen && (
        <VideoPlayer 
          file={file} 
          onClose={() => setIsPlayerOpen(false)} 
        />
      )}
    </>
  );
};

export default VideoPreview;
