import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useDriveFiles } from '../hooks/useDriveFiles';
import { useToast } from '../src/hooks/useToast';
import { DriveViewMode, DriveFileSortKey, DriveFileSortDir } from '../types/drive';
import KanbanView from '../components/files/KanbanView';
import GalleryView from '../components/files/GalleryView';
import TimelineView from '../components/files/TimelineView';
import FileBreadcrumb from '../components/files/FileBreadcrumb';
import FolderSidebar from '../components/files/FolderSidebar';
import FileCard from '../components/files/FileCard';
import FileUpload from '../components/files/FileUpload';
import StorageUsage from '../components/files/StorageUsage';
import MetadataSidebar from '../components/files/MetadataSidebar';
import ViewModeSelector from '../components/files/ViewModeSelector';
import FilterPanel from '../components/files/FilterPanel';
import FilterChips from '../components/files/FilterChips';
import { useFileFilters } from '../hooks/useFileFilters';
import { applyFileFilters } from '../utils/fileFilters';
import { toast } from 'sonner';
import { DriveFile } from '../types/drive';

// New Imports
import { useBulkSelection } from '../hooks/useBulkSelection';
import BulkActionsBar from '../components/files/BulkActionsBar';
import RecentFilesPanel from '../components/files/RecentFilesPanel';
import ShareDialog from '../components/files/ShareDialog';

// ─── localStorage helpers for view mode ─────────────────────────────────────
const VIEW_MODE_KEY = 'filesViewMode';
const VALID_MODES: DriveViewMode[] = ['list', 'grid', 'kanban', 'gallery', 'timeline'];

function getStoredViewMode(): DriveViewMode {
  try {
    const stored = localStorage.getItem(VIEW_MODE_KEY) as DriveViewMode | null;
    if (stored && VALID_MODES.includes(stored)) return stored;
  } catch { /* ignore */ }
  return 'list';
}

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

// ─── Placeholder view components (DES-103, DES-113, DES-119 ─ upcoming) ───────
interface PlaceholderProps {
  files: DriveFile[];
  onDelete: (fileId: string) => Promise<void>;
  onSelect: (file: DriveFile | null) => void;
}




const FilesPage: React.FC = () => {

  const {
    files, folders, stats,
    isLoading, isRefreshing, isUploading, uploadProgress,
    error, currentPath, autoRefreshEnabled, lastRefreshTime,
    navigate, goUp, refresh, toggleAutoRefresh, upload, remove, move, createFolder,
  } = useDriveFiles('');

  const { info: showInfo } = useToast();

  const [viewMode, setViewMode]     = useState<DriveViewMode>(getStoredViewMode);
  const [sortKey, setSortKey]       = useState<DriveFileSortKey>('modifiedTime');
  const [sortDir, setSortDir]       = useState<DriveFileSortDir>('desc');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [fileToShare, setFileToShare] = useState<DriveFile | null>(null);

  // ── Filters & Computed metadata ────────────────────────────────────────────
  const filterState = useFileFilters();
  const availableOwners = useMemo(() => {
    const owners = new Set<string>();
    files.forEach(f => {
      f.owners?.forEach(o => {
        if (o.displayName) owners.add(o.displayName);
        else if (o.emailAddress) owners.add(o.emailAddress);
      });
    });
    return Array.from(owners).sort();
  }, [files]);

  // ── Bulk Selection & Operations ─────────────────────────────────────────────
  const displayFileIds = useMemo(() => files.map(f => f.id), [files]);
  const bulk = useBulkSelection(displayFileIds);

  const handleBulkDelete = useCallback(async (fileIds: string[]) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : 'https://client.samixism.com')}/api/drive/files/bulk/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Bulk delete failed');
      toast.success(`Deleted ${data.data.deleted} files`);
      if (data.data.failed > 0) toast.error(`Failed to delete ${data.data.failed} files`);
      await refresh();
    } catch (err) {
      throw err;
    }
  }, [refresh]);

  const handleBulkDownload = useCallback(async (fileIds: string[]) => {
    // Generate individual public links to bypass auth requirements for multi-file download zip creation
    // Open a new window for each file with a slight delay
    fileIds.forEach((id, index) => {
      setTimeout(() => {
        window.open(`https://drive.google.com/uc?export=download&id=${id}`, '_blank');
      }, index * 500); // 500ms delay between opens to prevent browser popup blockers
    });
  }, []);

  // ── Detect new files after refresh ─────────────────────────────────────────

  const prevFileCountRef = useRef<number>(files.length);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    // Skip the toast on the initial load
    if (isFirstRenderRef.current) {
      prevFileCountRef.current = files.length;
      isFirstRenderRef.current = false;
      return;
    }
    if (files.length > prevFileCountRef.current) {
      const added = files.length - prevFileCountRef.current;
      showInfo(
        `📂 ${added} new file${added === 1 ? '' : 's'} available`,
        'The file list has been updated.'
      );
    }
    prevFileCountRef.current = files.length;
  }, [files]);

  // ── Debounced search ───────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]           = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── Persist view mode to localStorage (DES-121) ─────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(VIEW_MODE_KEY, viewMode); } catch { /* ignore */ }
  }, [viewMode]);

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
    let list = applyFileFilters(files, filterState.filters);
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
  }, [files, search, sortKey, sortDir, filterState.filters]);

  const isDisabled = isLoading || isUploading;

  return (
    <div
      className={`flex flex-col h-full min-h-0 transition-colors ${pageDragging ? 'ring-2 ring-primary ring-inset rounded-xl' : ''}`}
      onDragOver={handlePageDragOver}
      onDragEnter={handlePageDragEnter}
      onDragLeave={handlePageDragLeave}
      onDrop={handlePageDrop}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 mb-5 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Files</h1>
          <div className="mt-1">
            <FileBreadcrumb currentPath={currentPath} onNavigate={navigate} />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* View mode selector — DES-86 (5 modes) */}
          <ViewModeSelector currentMode={viewMode} onChange={setViewMode} />

          {/* Refresh button — DES-91/DES-125 */}
          <button
            onClick={refresh}
            disabled={isDisabled}
            aria-label="Refresh file listings"
            title="Refresh file listings"
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-glass border border-border-color text-text-secondary hover:text-text-primary hover:bg-glass-light transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className={`w-4 h-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>

          {/* Auto-refresh toggle — DES-108 */}
          <button
            onClick={toggleAutoRefresh}
            aria-label={`Auto-polling: ${autoRefreshEnabled ? 'on' : 'off'}`}
            title={autoRefreshEnabled ? 'Auto-refresh on — click to disable' : 'Enable auto-refresh every 30 s'}
            className={`h-9 flex items-center gap-1.5 px-3 rounded-xl border transition-all ${
              autoRefreshEnabled
                ? 'bg-primary/10 border-primary/40 text-primary hover:bg-primary/20'
                : 'bg-glass border-border-color text-text-secondary hover:text-text-primary hover:bg-glass-light'
            }`}
          >
            {/* Pulsing dot indicator */}
            <span className="relative flex h-2 w-2 shrink-0">
              {autoRefreshEnabled && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${autoRefreshEnabled ? 'bg-primary' : 'bg-text-secondary/40'}`}
              />
            </span>
            <span className="text-xs font-medium">
              {autoRefreshEnabled ? 'Live' : 'Auto'}
            </span>
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

      {/* ── Last refresh timestamp ────────────────────────────────────────────── */}
      {lastRefreshTime && (
        <p className="text-xs text-text-secondary mb-3 shrink-0">
          Last updated{' '}
          {lastRefreshTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          {autoRefreshEnabled && <span className="ml-1 text-primary">· auto-refresh on</span>}
        </p>
      )}

      {/* ── Error banner ────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm shrink-0">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      {/* ── Upload panel ────────────────────────────────────────────────────── */}
      {showUpload && (
        <div className="mb-4 shrink-0">
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
          onMoveFile={move}
          onCreateFolder={createFolder}
        />

        {/* File content area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
          
          <RecentFilesPanel onSelectFile={setSelectedFile} />
          
          <BulkActionsBar 
            count={bulk.count} 
            selectedIds={bulk.selectedIds} 
            onClearAll={bulk.clearAll} 
            onBulkDelete={handleBulkDelete} 
            onBulkDownload={handleBulkDownload} 
          />
          {/* Search + back */}
          <div className="flex items-center gap-2 mb-3 shrink-0">
            {currentPath && (
              <button
                onClick={goUp}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-glass-light transition-colors shrink-0"
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

          {/* Filter panel & chips — DES-79 */}
          <div className="flex flex-col shrink-0">
            <FilterPanel {...filterState} availableOwners={availableOwners} />
            <FilterChips {...filterState} />
          </div>

          {/* List/Timeline headers (list + timeline view only) — DES-90 */}
          {(viewMode === 'list' || viewMode === 'timeline') && (
            <div className="flex items-center gap-3 px-3 pb-1 text-xs font-medium text-text-secondary uppercase tracking-wider shrink-0">
              <div className="w-5" />
              <button className="flex-1 text-left hover:text-text-primary transition-colors flex items-center gap-1" onClick={() => handleSort('name')}>
                Name <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <span className="w-12 text-right hidden sm:block">Type</span>
              <button className="w-16 text-right hover:text-text-primary transition-colors flex items-center justify-end gap-1" onClick={() => handleSort('size')}>
                Size <SortIcon col="size" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <button className="w-20 text-right hover:text-text-primary transition-colors flex items-center justify-end gap-1" onClick={() => handleSort('modifiedTime')}>
                Modified <SortIcon col="modifiedTime" sortKey={sortKey} sortDir={sortDir} />
              </button>
              <div className="w-8" />
            </div>
          )}

          {/* File list / grid / kanban / gallery / timeline */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-text-secondary">
                <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <p className="text-sm">{isRefreshing ? 'Refreshing...' : 'Loading files...'}</p>
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
              /* Enhanced Grid — DES-94: fewer, larger columns */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-4">
                {displayFiles.map(file => (
                  <FileCard 
                    key={file.id} 
                    file={file} 
                    viewMode="grid" 
                    isSelected={bulk.isSelected(file.id)}
                    onToggleSelect={bulk.toggle}
                    onShare={setFileToShare}
                    onDelete={handleDelete} 
                    onClick={() => setSelectedFile(file)} 
                  />
                ))}
              </div>
            ) : viewMode === 'kanban' ? (
              /* Kanban View — DES-103 */
              <KanbanView files={displayFiles} onDelete={handleDelete} onSelect={setSelectedFile} />
            ) : viewMode === 'gallery' ? (
              /* Gallery view — DES-113 */
              <GalleryView files={displayFiles} onDelete={handleDelete} onSelect={setSelectedFile} />
            ) : viewMode === 'timeline' ? (
              /* Timeline view — DES-119 */
              <TimelineView files={displayFiles} onDelete={handleDelete} onSelect={setSelectedFile} />
            ) : (
              /* List view — DES-90 enhanced */
              <div className="flex flex-col pb-4">
                {displayFiles.map(file => (
                  <FileCard 
                    key={file.id} 
                    file={file} 
                    viewMode="list" 
                    isSelected={bulk.isSelected(file.id)}
                    onToggleSelect={bulk.toggle}
                    onShare={setFileToShare}
                    onDelete={handleDelete} 
                    onClick={() => setSelectedFile(file)} 
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer: file count + storage */}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-border-color shrink-0">
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

      {/* Metadata Sidebar (DES-77) */}
      {selectedFile && (
        <MetadataSidebar 
          file={selectedFile} 
          onClose={() => setSelectedFile(null)} 
          onDelete={handleDelete} 
        />
      )}
      
      {/* Share Dialog (DES-111) */}
      <ShareDialog 
        file={fileToShare} 
        onClose={() => setFileToShare(null)} 
      />
    </div>
  );
};

export default FilesPage;
