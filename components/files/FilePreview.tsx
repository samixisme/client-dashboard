import React, { Suspense, useRef } from 'react';
import { DriveFile, getFileCategory } from '../../types/drive';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import { Loader2, File as FileIcon } from 'lucide-react';

const ImagePreview = React.lazy(() => import('./ImagePreview'));
const PDFPreview = React.lazy(() => import('./PDFPreview'));
const VideoPreview = React.lazy(() => import('./VideoPreview'));
const OfficeDocumentPreview = React.lazy(() => import('./OfficeDocumentPreview'));
const CodePreview = React.lazy(() => import('./CodePreview'));

interface FilePreviewProps {
  file: DriveFile;
}

const LoadingFallback = () => (
  <div className="w-full h-full flex items-center justify-center bg-glass">
    <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
  </div>
);

const DefaultPreview = ({ file }: { file: DriveFile }) => {
  if (file.thumbnailLink) {
    return (
      <div className="w-full h-full bg-glass flex items-center justify-center overflow-hidden relative group">
         <img 
            src={file.thumbnailLink} 
            alt={`Preview of ${file.name}`}
            loading="lazy"
            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform"
         />
         <div className="absolute inset-0 border border-border-color/50 rounded-t-xl group-hover:border-primary/30 transition-colors pointer-events-none" />
      </div>
    );
  }
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-glass border border-border-color rounded-t-xl group hover:border-primary/30 transition-colors">
       <FileIcon className="w-10 h-10 text-text-secondary opacity-50 mb-2 group-hover:opacity-80 group-hover:scale-105 transition-all" />
       <span className="text-[10px] text-text-secondary px-2 text-center break-all line-clamp-2">{file.name}</span>
    </div>
  );
};

const FilePreview: React.FC<FilePreviewProps> = ({ file }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const entry = useIntersectionObserver(containerRef, { freezeOnceVisible: true, rootMargin: '200px' });
  const isVisible = !!entry?.isIntersecting;

  const category = getFileCategory(file.mimeType);
  const extension = file.name.split('.').pop()?.toLowerCase();
  const isCode = ['js', 'ts', 'jsx', 'tsx', 'json', 'py', 'html', 'css', 'go', 'rs', 'md', 'sh'].includes(extension || '');

  const renderPreview = () => {
    if (category === 'image') return <ImagePreview file={file} />;
    if (category === 'video' || file.mimeType.startsWith('video/')) return <VideoPreview file={file} />;
    if (file.mimeType === 'application/pdf') return <PDFPreview file={file} />;
    if (category === 'spreadsheet' || category === 'document' || file.mimeType.includes('officedocument') || file.mimeType.includes('msword') || file.mimeType.includes('excel') || file.mimeType.includes('powerpoint')) {
      return <OfficeDocumentPreview file={file} />;
    }
    if (isCode) return <CodePreview file={file} />;
    
    // Fallback for archives or unknown types
    return <DefaultPreview file={file} />;
  };

  return (
    <div ref={containerRef} className="w-full h-full rounded-t-xl overflow-hidden">
      {isVisible ? (
        <Suspense fallback={<LoadingFallback />}>
          {renderPreview()}
        </Suspense>
      ) : (
        <LoadingFallback />
      )}
    </div>
  );
};

export default FilePreview;
