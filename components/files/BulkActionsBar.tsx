import React, { useState } from 'react';
import { toast } from 'sonner';

interface BulkActionsBarProps {
  count: number;
  selectedIds: Set<string>;
  onClearAll: () => void;
  onBulkDelete: (fileIds: string[]) => Promise<void>;
  onBulkDownload: (fileIds: string[]) => Promise<void>;
}

/**
 * DES-98 / DES-104 — Sticky bulk-actions toolbar.
 * Appears at the top of the file list when 1+ files are selected.
 * Provides: selection count, Delete All (with confirm), Download All, Clear.
 */
const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  count,
  selectedIds,
  onClearAll,
  onBulkDelete,
  onBulkDownload,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting]       = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (count === 0) return null;

  const ids = Array.from(selectedIds);

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsDeleting(true);
    try {
      await onBulkDelete(ids);
      onClearAll();
      setConfirmDelete(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await onBulkDownload(ids);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 mb-3 rounded-xl bg-primary/10 border border-primary/30 shrink-0">
      {/* Selection count badge */}
      <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {count} {count === 1 ? 'file' : 'files'} selected
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Download All */}
      <button
        onClick={handleDownload}
        disabled={isDownloading || isDeleting}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-glass border border-border-color text-text-primary hover:bg-glass-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        {isDownloading ? 'Downloading…' : 'Download All'}
      </button>

      {/* Delete All */}
      <button
        onClick={handleDelete}
        disabled={isDeleting || isDownloading}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          confirmDelete
            ? 'bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30'
            : 'bg-glass border-border-color text-red-400 hover:bg-red-500/10'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
        {isDeleting ? 'Deleting…' : confirmDelete ? `Confirm — Delete ${count}?` : 'Delete All'}
      </button>

      {/* Clear selection */}
      <button
        onClick={() => { onClearAll(); setConfirmDelete(false); }}
        disabled={isDeleting}
        className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-glass-light transition-colors disabled:opacity-50"
        title="Clear selection (Esc)"
        aria-label="Clear selection"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default BulkActionsBar;
