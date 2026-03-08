import React, { useState } from 'react';
import { DriveFile } from '../../types/drive';
import ImageLightbox from './ImageLightbox';

interface ImagePreviewProps {
  file: DriveFile;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ file }) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  return (
    <>
      <div 
        className="w-full h-full cursor-pointer relative overflow-hidden bg-glass flex items-center justify-center"
        onClick={(e) => {
          e.stopPropagation();
          setIsLightboxOpen(true);
        }}
      >
        {file.thumbnailLink ? (
          <img 
            src={file.thumbnailLink} 
            alt={`Preview of ${file.name}`}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <span className="text-text-secondary text-xs">No preview</span>
        )}
      </div>

      {isLightboxOpen && (
        <ImageLightbox 
          file={file} 
          onClose={() => setIsLightboxOpen(false)} 
        />
      )}
    </>
  );
};

export default ImagePreview;
