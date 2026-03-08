import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { DriveFile, formatFileSize } from '../../types/drive';
import { X, ChevronLeft, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  file: DriveFile;
  onClose: () => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ file, onClose }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && numPages && pageNumber < numPages) setPageNumber(p => p + 1);
      if (e.key === 'ArrowLeft' && pageNumber > 1) setPageNumber(p => p - 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, numPages, pageNumber]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const pdfUrl = file.webContentLink || file.webViewLink || '';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/90 backdrop-blur-xl" onClick={onClose}>
      <div className="flex items-center justify-between p-4 bg-glass border-b border-border-color" onClick={e => e.stopPropagation()}>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
          <p className="text-xs text-text-secondary">{formatFileSize(file.size)}</p>
        </div>
        
        {/* Toolbar */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-background/50 rounded-lg px-2 py-1 border border-border-color">
            <button 
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber(p => Math.max(1, p - 1))}
              className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-glass disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-text-primary min-w-12 text-center">
              {pageNumber} / {numPages || '?'}
            </span>
            <button 
              disabled={numPages ? pageNumber >= numPages : true}
              onClick={() => setPageNumber(p => Math.min(numPages || p, p + 1))}
              className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-glass disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-glass-light transition-colors text-text-secondary hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex justify-center py-6" onClick={e => e.stopPropagation()}>
        <div className="p-4 bg-glass/20 rounded-xl max-w-full overflow-auto shadow-2xl border border-border-color">
          {pdfUrl ? (
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<div className="flex justify-center items-center h-64 w-48 text-text-secondary"><Loader2 className="w-8 h-8 animate-spin" /></div>}
              error={
                <div className="flex flex-col items-center justify-center h-64 w-64 gap-3 text-red-400">
                  <AlertCircle className="w-8 h-8" />
                  <p className="text-sm text-center">Failed to load PDF. Try downloading it instead.</p>
                </div>
              }
            >
              <Page 
                pageNumber={pageNumber} 
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-md mx-auto"
              />
            </Document>
          ) : (
            <div className="flex justify-center items-center h-64 w-64 text-text-secondary">No PDF URL available.</div>
          )}
        </div>
      </div>
    </div>
  );
};
