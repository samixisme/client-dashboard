import React, { useEffect, useRef } from 'react';
import { DriveFile } from '../../types/drive';
import { toast } from 'sonner';

interface ShareDialogProps {
  file: DriveFile | null;
  onClose: () => void;
}

function generateShareUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * DES-111 — Share dialog that generates a Google Drive download link.
 * Shows the link and provides one-click clipboard copy with toast feedback.
 */
const ShareDialog: React.FC<ShareDialogProps> = ({ file, onClose }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [file, onClose]);

  if (!file) return null;

  const shareUrl = generateShareUrl(file.id);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard');
    } catch {
      // Fallback: select the text input
      inputRef.current?.select();
      toast.error('Could not copy automatically — please copy manually');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md mx-4">
        <div className="bg-glass border border-border-color rounded-2xl shadow-2xl p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-text-primary">Share File</h2>
              <p className="text-xs text-text-secondary mt-0.5 truncate max-w-[280px]" title={file.name}>
                {file.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-glass-light transition-colors"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Link row */}
          <label className="block text-xs text-text-secondary mb-2">Download link</label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={shareUrl}
              readOnly
              className="flex-1 text-xs bg-glass-light border border-border-color rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-primary/50"
              onFocus={e => e.target.select()}
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-background text-xs font-medium hover:bg-primary/90 transition-colors shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
              </svg>
              Copy
            </button>
          </div>

          <p className="text-[10px] text-text-secondary mt-3">
            Anyone with this link can download the file via Google Drive.
          </p>
        </div>
      </div>
    </>
  );
};

export default ShareDialog;
