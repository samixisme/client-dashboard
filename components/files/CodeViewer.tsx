import React, { useState, useEffect } from 'react';
import { DriveFile, formatFileSize } from '../../types/drive';
import { X, Copy, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeViewerProps {
  file: DriveFile;
  onClose: () => void;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ file, onClose }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  useEffect(() => {
    const fetchContent = async () => {
      if (!file.webContentLink) {
        setError('No download link available for this file.');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(file.webContentLink);
        if (!res.ok) throw new Error('Failed to fetch file content');
        const text = await res.text();
        setContent(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [file]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
    <div className="fixed inset-0 z-50 flex flex-col bg-background/90 backdrop-blur-xl" onClick={onClose}>
      <div className="flex items-center justify-between p-4 bg-glass border-b border-border-color" onClick={e => e.stopPropagation()}>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
          <p className="text-xs text-text-secondary">{formatFileSize(file.size)}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {!loading && !error && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-glass hover:bg-glass-light transition-colors text-text-primary text-sm font-medium border border-border-color"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-glass-light transition-colors text-text-secondary hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4 flex flex-col max-w-6xl w-full mx-auto" onClick={e => e.stopPropagation()}>
        <div className="flex-1 bg-black/60 rounded-xl border border-border-color overflow-hidden flex flex-col shadow-2xl relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-text-secondary">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p>Loading code...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-red-400">
              <AlertCircle className="w-8 h-8" />
              <p>{error}</p>
            </div>
          ) : (
             <div className="flex-1 overflow-auto custom-scrollbar">
               <SyntaxHighlighter
                 language={getLanguage(extension)}
                 style={vscDarkPlus}
                 showLineNumbers
                 customStyle={{ margin: 0, background: 'transparent', padding: '1rem', fontSize: '13px' }}
               >
                 {content}
               </SyntaxHighlighter>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
