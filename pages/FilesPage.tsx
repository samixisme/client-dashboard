import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useDriveFiles } from '../hooks/useDriveFiles';
import { DriveViewMode, DriveFileSortKey, DriveFileSortDir } from '../types/drive';
import FileBreadcrumb from '../components/files/FileBreadcrumb';
import FolderSidebar from '../components/files/FolderSidebar';
import FileCard from '../components/files/FileCard';
import FileUpload from '../components/files/FileUpload';
import StorageUsage from '../components/files/StorageUsage';
import { toast } from 'sonner';

// ─── SortIcon lives at module scope so React never remounts it on re-render ──
interface SortIconProps {
  col: DriveFileSortKey;
  sortKey: DriveFileSortKey;
  sortDir: DriveFileSortDir;
}
const SortIcon: React.FC<SortIconProps> = ({ col, sortKey, sortDir }) => {
  if (sortKey !== col) return <span className="opacity-30">↕</span>;
  return <span>{sortDir === 'asc' ? '↑' : '↓'}</span>;
};

const FilesPage: React.FC = () => {
  const {
    files, folders, stats,
    isLoading, isUploading, uploadProgress,
    error, currentPath,
    navigate, goUp, refresh, upload, remove,
  } = useDriveFiles('');

  const [viewMode, setViewMode]     = useState<DriveViewMode>('list');
  const [sortKey, setSortKey]       = useState<DriveFileSortKey>('modifiedTime');
  const [sortDir, setSortDir]       = useState<DriveFileSortDir>('desc');
  const [showUpload, setShowUpload] = useState(false);

  // ── Debounced search ───────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]           = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── Page-level drag (use drag counter to avoid flicker on child elements) ──
  const [pageDragging, setPageDragging] = useState(false);
  const dragCounterRef = React.useRef(0);

  const handlePageDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handlePageDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setPageDragging(true);
  }, []);

  const handlePageDragLeave = useCallback(() => {
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setPageDragging(false);
  }, []);

  const handlePageDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setPageDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await handleUpload(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Upload handler ─────────────────────────────────────────────────────────
  const handleUpload = useCallback(async (file: File) => {
    try {
      await upload(file);
      toast.success(`"${file.name}" uploaded successfully`);
      setShowUpload(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  }, [upload]);

  // ── Delete handler ─────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (fileId: string) => {
    const fileName = files.find(f => f.id === fileId)?.name ?? 'File';
    try {
      await remove(fileId);
      toast.success(`"${fileName}" deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }, [remove, files]);

  // ── Sort toggle ─────────────────────────────────────────────────────────────
  const handleSort = useCallback((key: DriveFileSortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }, [sortKey]);

  // ── Filtered + sorted files ─────────────────────────────────────────────────
  const displayFiles = useMemo(() => {
    let list = files;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      let va: string | number = '';
      let vb: string | number = '';
      if (sortKey === 'name')         { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      if (sortKey === 'modifiedTime') { va = a.modifiedTime ?? ''; vb = b.modifiedTime ?? ''; }
      if (sortKey === 'size')         { va = parseInt(a.size ?? '0', 10); vb = parseInt(b.size ?? '0', 10); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [files, search, sortKey, sortDir]);

  return (
    <div
      className={`flex flex-col h-full min-h-0 transition-colors ${pageDragging ? 'ring-2 ring-primary ring-inset rounded-xl' : ''}`}
      onDragOver={handlePageDragOver}
      onDragEnter={handlePageDragEnter}
      onDragLeave={handlePageDragLeave}
      onDrop={handlePageDrop}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Files</h1>
          <div className="mt-1">
            <FileBreadcrumb currentPath={currentPath} onNavigate={navigate} />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View toggle */}
          <div className="flex items-center bg-glass border border-border-color rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('list')}
              title="List view"
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary text-background' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              title="Grid view"
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-primary text-background' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={refresh}
            disabled={isLoading}
            title="Refresh"
            className="p-2 rounded-lg bg-glass border border-border-color text-text-secondary hover:text-text-primary hover:bg-glass-light transition-colors disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>

          {/* Upload button */}
          <button
            onClick={() => setShowUpload(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-background text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Upload
          </button>
        </div>
      </div>

      {/* ── Error banner ────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex-shrink-0">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      {/* ── Upload panel ────────────────────────────────────────────────────── */}
      {showUpload && (
        <div className="mb-4 flex-shrink-0">
          <FileUpload
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            onUpload={handleUpload}
          />
        </div>
      )}

      {/* ── Main body ───────────────────────────────────────────────────────── */}
      <div className="flex gap-5 flex-1 min-h-0">
        {/* Folder sidebar */}
        <FolderSidebar
          folders={folders}
          currentPath={currentPath}
          onNavigate={navigate}
        />

        {/* File content area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Search + back */}
          <div className="flex items-center gap-2 mb-3 flex-shrink-0">
            {currentPath && (
              <button
                onClick={goUp}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-glass-light transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back
              </button>
            )}
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search files..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-glass border border-border-color text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          {/* List headers (list view only) */}
          {viewMode === 'list' && (
            <div className="flex items-center gap-3 px-3 pb-1 text-xs font-medium text-text-secondary uppercase tracking-wider flex-shrink-0">
              <div className="w-5" />
              <button className="flex-1 text-left hover:text-text-primary transition-colors flex items-center gap-1" onClick={() => handleSort('name')}>
                Name <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <span className="w-12 text-right">Type</span>
              <button className="w-16 text-right hover:text-text-primary transition-colors flex items-center justify-end gap-1" onClick={() => handleSort('size')}>
                Size <SortIcon col="size" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <button className="w-20 text-right hover:text-text-primary transition-colors flex items-center justify-end gap-1" onClick={() => handleSort('modifiedTime')}>
                Modified <SortIcon col="modifiedTime" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <div className="w-8" />
            </div>
          )}

          {/* File list / grid */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-text-secondary">
                <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <p className="text-sm">Loading files...</p>
              </div>
            ) : displayFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-text-secondary">
                <svg className="w-12 h-12 opacity-30" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
                <p className="text-sm">{search ? 'No files match your search' : 'No files here yet'}</p>
                {!search && (
                  <button
                    onClick={() => setShowUpload(true)}
                    className="text-sm text-primary hover:underline mt-1"
                  >
                    Upload the first file
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-4">
                {displayFiles.map(file => (
                  <FileCard key={file.id} file={file} viewMode="grid" onDelete={handleDelete} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col pb-4">
                {displayFiles.map(file => (
                  <FileCard key={file.id} file={file} viewMode="list" onDelete={handleDelete} />
                ))}
              </div>
            )}
          </div>

          {/* Footer: file count + storage */}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-border-color flex-shrink-0">
            <span className="text-xs text-text-secondary">
              {displayFiles.length} {displayFiles.length === 1 ? 'file' : 'files'}
              {search && ` matching "${search}"`}
            </span>
            <StorageUsage stats={stats} />
          </div>
        </div>
      </div>

      {/* Page-level drag overlay hint */}
      {pageDragging && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-primary">
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-lg font-semibold">Drop to upload</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilesPage;
