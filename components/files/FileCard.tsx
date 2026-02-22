import React, { useState, useEffect } from 'react';
import { DriveFile, DriveFileCategory, formatFileSize, formatRelativeTime, getFileCategory, MIME_LABELS } from '../../types/drive';

interface FileCardProps {
  file: DriveFile;
  viewMode: 'list' | 'grid';
  onDelete: (fileId: string) => Promise<void>;
}

const CategoryIcon: React.FC<{ mimeType: string; className?: string }> = ({ mimeType, className }) => {
  const category = getFileCategory(mimeType);

  if (category === 'image') return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );

  if (category === 'video') return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );

  if (category === 'spreadsheet') return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.875v1.5m1.125-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125h-1.5" />
    </svg>
  );

  if (category === 'archive') return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );

  // document / other
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
};

const iconColorMap: Record<DriveFileCategory, string> = {
  image:       'text-blue-400',
  video:       'text-purple-400',
  document:    'text-red-400',
  spreadsheet: 'text-green-400',
  archive:     'text-yellow-400',
  other:       'text-text-secondary',
};

const FileCard: React.FC<FileCardProps> = ({ file, viewMode, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const category = getFileCategory(file.mimeType);
  const iconColor = iconColorMap[category] ?? 'text-text-secondary';
  const label = MIME_LABELS[file.mimeType] ?? 'File';

  // Close menu on Escape key
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenuOpen(false); setConfirmDelete(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await onDelete(file.id);
    setMenuOpen(false);
    setConfirmDelete(false);
  };

  if (viewMode === 'grid') {
    return (
      <div className="group relative flex flex-col gap-2 p-3 rounded-xl bg-glass border border-border-color hover:border-primary/40 hover:bg-glass-light transition-all">
        <div className={`flex items-center justify-center h-14 ${iconColor}`}>
          <CategoryIcon mimeType={file.mimeType} className="w-10 h-10" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-text-primary truncate" title={file.name}>{file.name}</p>
          <p className="text-xs text-text-secondary">{formatFileSize(file.size)}</p>
        </div>
        <FileActions
          file={file}
          menuOpen={menuOpen}
          confirmDelete={confirmDelete}
          onMenuToggle={() => { setMenuOpen(o => !o); setConfirmDelete(false); }}
          onMenuClose={() => { setMenuOpen(false); setConfirmDelete(false); }}
          onDelete={handleDelete}
          label={label}
        />
      </div>
    );
  }

  // List view
  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-glass-light transition-colors">
      <CategoryIcon mimeType={file.mimeType} className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate" title={file.name}>{file.name}</p>
      </div>
      <span className="text-xs text-text-secondary w-12 text-right flex-shrink-0">{label}</span>
      <span className="text-xs text-text-secondary w-16 text-right flex-shrink-0">{formatFileSize(file.size)}</span>
      <span className="text-xs text-text-secondary w-20 text-right flex-shrink-0">{formatRelativeTime(file.modifiedTime)}</span>
      <div className="w-8 flex-shrink-0 flex justify-end">
        <FileActions
          file={file}
          menuOpen={menuOpen}
          confirmDelete={confirmDelete}
          onMenuToggle={() => { setMenuOpen(o => !o); setConfirmDelete(false); }}
          onMenuClose={() => { setMenuOpen(false); setConfirmDelete(false); }}
          onDelete={handleDelete}
          label={label}
        />
      </div>
    </div>
  );
};

// ─── File Actions (kebab menu) ────────────────────────────────────────────────
interface FileActionsProps {
  file: DriveFile;
  menuOpen: boolean;
  confirmDelete: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onDelete: () => void;
  label: string;
}

const FileActions: React.FC<FileActionsProps> = ({
  file, menuOpen, confirmDelete, onMenuToggle, onMenuClose, onDelete,
}) => {
  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
        className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-glass transition-colors opacity-0 group-hover:opacity-100"
        title="Actions"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
        </svg>
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={onMenuClose} />
          <div className="absolute right-0 top-7 z-20 w-44 bg-background border border-border-color rounded-xl shadow-lg overflow-hidden">
            {file.webViewLink && (
              <a
                href={file.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-glass-light transition-colors"
                onClick={onMenuClose}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                Open in Drive
              </a>
            )}
            {file.webContentLink && (
              <a
                href={file.webContentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-glass-light transition-colors"
                onClick={onMenuClose}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download
              </a>
            )}
            <button
              onClick={onDelete}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                confirmDelete
                  ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
                  : 'text-red-400 hover:bg-glass-light'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              {confirmDelete ? 'Click to confirm' : 'Delete'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default FileCard;
