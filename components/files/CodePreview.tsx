import React, { useState, useEffect, useRef } from 'react';
import { DriveFile } from '../../types/drive';
import { CodeViewer } from './CodeViewer';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Code2, Loader2 } from 'lucide-react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';

interface CodePreviewProps {
  file: DriveFile;
}

const CodePreview: React.FC<CodePreviewProps> = ({ file }) => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const entry = useIntersectionObserver(containerRef, { freezeOnceVisible: true, rootMargin: '200px' });
  const isVisible = !!entry?.isIntersecting;

  useEffect(() => {
    if (isVisible && !hasFetched && file.webContentLink) {
      setHasFetched(true);
      setLoading(true);
      fetch(file.webContentLink)
        .then(res => {
          if (!res.ok) throw new Error();
          return res.text();
        })
        .then(text => setContent(text.split('\n').slice(0, 15).join('\n')))
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }
  }, [isVisible, hasFetched, file]);

  const extension = file.name.split('.').pop()?.toLowerCase() || 'text';
  const getLanguage = (ext: string) => {
    const map: Record<string, string> = {
      js: 'javascript', ts: 'typescript', jsx: 'jsx', tsx: 'tsx',
      json: 'json', html: 'html', css: 'css', py: 'python',
      rs: 'rust', go: 'go', md: 'markdown', sh: 'bash'
    };
    return map[ext] || 'text';
  };

  return (
    <>
      <div 
        ref={containerRef}
        className="w-full h-full flex flex-col bg-glass cursor-pointer hover:bg-glass-light transition-colors group relative overflow-hidden"
        onClick={(e) => {
          e.stopPropagation();
          setIsViewerOpen(true);
        }}
      >
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-text-secondary">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : error || (!content && hasFetched) ? (
          <div className="flex-1 flex flex-col items-center justify-center text-text-secondary">
            <Code2 className="w-10 h-10 opacity-70 group-hover:scale-110 transition-transform mb-1" />
            <span className="text-[10px] uppercase font-semibold tracking-wider opacity-60">Code File</span>
          </div>
        ) : content ? (
          <div className="relative w-full h-full text-[8px] sm:text-[10px] opacity-80 group-hover:opacity-100 transition-opacity">
             <SyntaxHighlighter
               language={getLanguage(extension)}
               style={vscDarkPlus}
               customStyle={{ margin: 0, background: 'transparent', padding: '0.5rem', height: '100%', overflow: 'hidden' }}
             >
               {content}
             </SyntaxHighlighter>
             {/* Fade out bottom overlay */}
             <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-[#121212] flex items-end justify-center pb-2 pointer-events-none" />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
             <Code2 className="w-10 h-10 text-text-secondary opacity-50" />
          </div>
        )}

        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-background/80 text-text-primary border border-border-color backdrop-blur-md z-10">
          {extension.toUpperCase()}
        </div>
      </div>

      {isViewerOpen && (
        <CodeViewer 
          file={file} 
          onClose={() => setIsViewerOpen(false)} 
        />
      )}
    </>
  );
};

export default CodePreview;
