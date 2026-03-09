import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { ProjectFile, ProjectLink } from '../types';
import { DriveFile, DriveViewMode, DriveFileSortKey, DriveFileSortDir } from '../types/drive';
import { useDriveFiles } from '../hooks/useDriveFiles';
import { useFileFilters } from '../hooks/useFileFilters';
import { useFileStars } from '../hooks/useFileStars';
import { applyFileFilters } from '../utils/fileFilters';
import { useBulkSelection } from '../hooks/useBulkSelection';

// Components
import LibrarySidebar, { LibraryTab } from '../components/files/LibrarySidebar';
import FileUpload from '../components/files/FileUpload';
import AddLinkDialog from '../components/files/AddLinkDialog';
import LinkCard from '../components/files/LinkCard';
import PreviewModal from '../components/files/PreviewModal';
import FileCard from '../components/files/FileCard';
import ViewModeSelector from '../components/files/ViewModeSelector';
import MetadataSidebar from '../components/files/MetadataSidebar';
import FolderGrid from '../components/files/FolderGrid';
import BulkActionsBar from '../components/files/BulkActionsBar';
import FilterPanel from '../components/files/FilterPanel';
import FilterChips from '../components/files/FilterChips';
import ShareDialog from '../components/files/ShareDialog';
import KanbanView from '../components/files/KanbanView';
import TimelineView from '../components/files/TimelineView';
import { toast } from 'sonner';

// ─── localStorage helpers ────────────────────────────────────────────────────
const VIEW_MODE_KEY = 'projectFilesViewMode';
const VALID_MODES: DriveViewMode[] = ['list', 'grid', 'kanban', 'timeline'];

function getStoredViewMode(): DriveViewMode {
  try {
    const stored = localStorage.getItem(VIEW_MODE_KEY) as DriveViewMode | null;
    if (stored && VALID_MODES.includes(stored)) return stored;
  } catch { /* ignore */ }
  return 'grid';
}

// ─── Sort icon ────────────────────────────────────────────────────────────────
const SortIcon: React.FC<{ col: DriveFileSortKey; sortKey: DriveFileSortKey; sortDir: DriveFileSortDir }> = ({ col, sortKey, sortDir }) => {
  if (sortKey !== col) return <span className="opacity-30">↕</span>;
  return <span>{sortDir === 'asc' ? '↑' : '↓'}</span>;
};

const ProjectFilesPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const safeProjectId = projectId || '';
  const navigate = useNavigate();
  const { data } = useData();

  // ── Drive files (full DriveFile type for new components) ─────────────────
  const filterState = useFileFilters();

  const {
    files: driveFiles,
    folders,
    isLoading: driveLoading,
    isRefreshing,
    isUploading,
    uploadProgress,
    error: driveError,
    currentPath,
    navigationStack,
    navigate: navigateFolder,
    goUp,
    refresh,
    upload,
    remove,
    move,
    createFolder
  } = useDriveFiles({ projectId: safeProjectId });

  // ── Project-native files (task attachments, mockups, videos) ─────────────
  const projectLinks = useMemo(
    () => data.projectLinks.filter(l => l.projectId === safeProjectId),
    [data.projectLinks, safeProjectId]
  );

  // Non-drive project files (task attachments, mockups, feedback videos)
  const nativeProjFiles = useMemo((): ProjectFile[] => {
    const out: ProjectFile[] = [];

    // Task Attachments
    const projectBoardIds = data.boards.filter(b => b.projectId === safeProjectId).map(b => b.id);
    const tasks = data.tasks.filter(t => projectBoardIds.includes(t.boardId));
    tasks.forEach(task => {
      (task.attachments ?? []).forEach(att => {
        out.push({
          id: `task:${task.id}:${att.id}`,
          projectId: safeProjectId,
          name: att.name,
          url: att.url,
          type: att.type,
          source: 'task',
          sourceRoute: `/projects/${safeProjectId}/board/${task.boardId}?task=${task.id}`,
          createdAt: task.createdAt,
        });
      });
    });

    // Feedback Mockups
    data.feedbackMockups.filter(m => m.projectId === safeProjectId).forEach(mockup => {
      (mockup.images ?? []).forEach(img => {
        out.push({
          id: `mockup:${mockup.id}:${img.id}`,
          projectId: safeProjectId,
          name: img.name,
          url: img.url,
          type: 'image',
          source: 'mockup',
          sourceRoute: `/projects/${safeProjectId}/feedback/${mockup.id}`,
          createdAt: img.createdAt || new Date(),
        });
      });
    });

    // Feedback Videos
    data.feedbackVideos.filter(v => v.projectId === safeProjectId).forEach(video => {
      (video.videos ?? []).forEach(vid => {
        out.push({
          id: `video:${video.id}:${vid.id}`,
          projectId: safeProjectId,
          name: vid.name,
          url: vid.url,
          type: 'video',
          source: 'video',
          sourceRoute: `/projects/${safeProjectId}/feedback/${video.id}`,
          createdAt: new Date(),
        });
      });
    });

    return out;
  }, [safeProjectId, data.boards, data.tasks, data.feedbackMockups, data.feedbackVideos]);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const VALID_TABS: LibraryTab[] = ['files.all', 'files.recent', 'files.starred', 'links'];
  const activeTab: LibraryTab =
    rawTab && VALID_TABS.includes(rawTab as LibraryTab)
      ? (rawTab as LibraryTab)
      : 'files.all';

  const handleTabChange = useCallback((tab: LibraryTab) => {
    setSearchParams({ tab }, { replace: true });
  }, [setSearchParams]);

  const [searchQuery, setSearchQuery]       = useState('');
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editingLink, setEditingLink]       = useState<ProjectLink | undefined>(undefined);
  const [viewMode, setViewMode]             = useState<DriveViewMode>(getStoredViewMode);
  const [sortKey, setSortKey]               = useState<DriveFileSortKey>('modifiedTime');
  const [sortDir, setSortDir]               = useState<DriveFileSortDir>('desc');
  const [selectedFile, setSelectedFile]     = useState<DriveFile | null>(null);
  const [previewFile, setPreviewFile]       = useState<DriveFile | null>(null);
  const [fileToShare, setFileToShare]       = useState<DriveFile | null>(null);

  useEffect(() => {
    try { localStorage.setItem(VIEW_MODE_KEY, viewMode); } catch { /* noop */ }
  }, [viewMode]);

  // ── Filters (Drive files only) ────────────────────────────────────────────
  const availableOwners = useMemo(() => {
    const owners = new Set<string>();
    driveFiles.forEach(f => {
      f.owners?.forEach(o => {
        if (o.displayName) owners.add(o.displayName);
        else if (o.emailAddress) owners.add(o.emailAddress);
      });
    });
    return Array.from(owners).sort();
  }, [driveFiles]);

  // ── Starred IDs (for filter) ────────────────────────────────────────────
  const { starredIds } = useFileStars();

  // ── Bulk selection (Drive files only) ────────────────────────────────────
  const driveFileIds = useMemo(() => driveFiles.map(f => f.id), [driveFiles]);
  const bulk = useBulkSelection(driveFileIds);

  // ── New-file toast on refresh ─────────────────────────────────────────────
  const prevCountRef   = useRef(driveFiles.length);
  const firstRenderRef = useRef(true);
  useEffect(() => {
    if (firstRenderRef.current) { prevCountRef.current = driveFiles.length; firstRenderRef.current = false; return; }
    if (driveFiles.length > prevCountRef.current) {
      const added = driveFiles.length - prevCountRef.current;
      toast.info(`📂 ${added} new file${added === 1 ? '' : 's'} available`);
    }
    prevCountRef.current = driveFiles.length;
  }, [driveFiles]);

  // ── Filtered + sorted Drive files ────────────────────────────────────────
  const displayDriveFiles = useMemo(() => {
    let list = applyFileFilters(driveFiles, filterState.filters);
    // Sub-tab filtering (DES-169)
    if (activeTab === 'files.recent') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      list = list.filter(f => f.modifiedTime && new Date(f.modifiedTime) >= sevenDaysAgo);
    } else if (activeTab === 'files.starred') {
      list = list.filter(f => starredIds.has(f.id));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      let va: string | number = '', vb: string | number = '';
      if (sortKey === 'name')         { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      if (sortKey === 'modifiedTime') { va = a.modifiedTime ?? ''; vb = b.modifiedTime ?? ''; }
      if (sortKey === 'size')         { va = parseInt(a.size ?? '0', 10); vb = parseInt(b.size ?? '0', 10); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [driveFiles, searchQuery, sortKey, sortDir, filterState.filters, activeTab, starredIds]);

  const handleSort = useCallback((key: DriveFileSortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }, [sortKey]);

  const handleCreateFolder = async () => {
    const name = window.prompt("Enter new folder name:");
    if (name && name.trim()) {
      try {
        await createFolder(name.trim());
        toast.success(`Folder "${name}" created`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create folder');
      }
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleUpload = useCallback(async (file: File) => {
    try {
      await upload(file);
      toast.success(`"${file.name}" uploaded successfully`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  }, [upload]);

  const handleDelete = useCallback(async (fileId: string) => {
    const name = driveFiles.find(f => f.id === fileId)?.name ?? 'File';
    try {
      await remove(fileId);
      toast.success(`"${name}" deleted`);
      if (selectedFile?.id === fileId) setSelectedFile(null);
      if (previewFile?.id === fileId) setPreviewFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }, [remove, driveFiles, selectedFile, previewFile]);

  const handleBulkDelete = useCallback(async (fileIds: string[]) => {
    const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : 'https://client.samixism.com');
    const res = await fetch(`${apiBase}/api/drive/files/bulk/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileIds }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Bulk delete failed');
    toast.success(`Deleted ${data.data.deleted} files`);
    if (data.data.failed > 0) toast.error(`Failed to delete ${data.data.failed} files`);
    await refresh();
  }, [refresh]);

  const handleBulkDownload = useCallback(async (fileIds: string[]) => {
    fileIds.forEach((id, i) => setTimeout(() => window.open(`https://drive.google.com/uc?export=download&id=${id}`, '_blank'), i * 500));
  }, []);

  const handleNativeFileClick = useCallback((file: ProjectFile) => {
    if (file.sourceRoute) {
      if (file.sourceRoute.startsWith('/')) navigate(file.sourceRoute);
      else window.open(file.sourceRoute, '_blank', 'noopener');
    } else if (file.url) {
      window.open(file.url, '_blank', 'noopener');
    }
  }, [navigate]);

  // Filtered native files from non-drive sources (for search)
  const filteredNativeFiles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return nativeProjFiles.filter(f => !q || f.name.toLowerCase().includes(q));
  }, [nativeProjFiles, searchQuery]);

  // Derived visibility based on tab
  const canUpload = activeTab.startsWith('files.');
  const canAddLink = activeTab === 'links';

  return (
    <div className="flex h-full overflow-hidden px-4 md:px-10 pt-4 pb-24 md:pb-10">
      {/* Sidebar */}
      <LibrarySidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Main Content */}
      <div className="flex-1 pl-6 flex flex-col min-h-0">
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 flex-1 min-h-0">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
            <div>
              <h1 className="text-3xl font-bold text-text-primary">Project Files</h1>
              <p className="text-text-secondary mt-1 text-sm">
                All attachments, links, and Drive files for this project.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* View mode selector — only relevant for Drive files */}
              {activeTab.startsWith('files.') && (
                <ViewModeSelector currentMode={viewMode} onChange={setViewMode} />
              )}

              {/* Refresh */}
              {activeTab.startsWith('files.') && (
                <button
                  onClick={refresh}
                  disabled={driveLoading || isUploading}
                  aria-label="Refresh Drive files"
                  title="Refresh"
                  className="h-9 w-9 flex items-center justify-center rounded-xl bg-glass border border-border-color text-text-secondary hover:text-text-primary hover:bg-glass-light transition-all disabled:opacity-50"
                >
                  <svg className={`w-4 h-4 ${driveLoading || isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              )}

              {canUpload && activeTab.startsWith('files.') && (
                <button
                  onClick={handleCreateFolder}
                  className="px-4 py-2 text-sm font-bold bg-glass border border-border-color text-text-primary rounded-xl hover:bg-glass-light transition-colors shrink-0"
                >
                  <span className="mr-1">+</span> Folder
                </button>
              )}

              {canAddLink && activeTab === 'links' && (
                <button
                  onClick={() => { setEditingLink(undefined); setLinkDialogOpen(true); }}
                  className="px-4 py-2 text-sm font-bold bg-glass border border-border-color text-text-primary rounded-xl hover:bg-glass-light transition-colors shrink-0"
                >
                  <span className="mr-1">+</span> Link
                </button>
              )}

              {/* Search */}
              <div className="relative w-full md:w-52">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  placeholder={activeTab.startsWith('files.') ? "Search files..." : "Search links..."}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-glass border border-border-color rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          </header>

          {/* ── Upload zone ─────────────────────────────────────────────── */}
          {canUpload && (
            <div className="shrink-0">
              {driveError && (
                <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                  ⚠️ {driveError}
                </div>
              )}
              <FileUpload isUploading={isUploading} uploadProgress={uploadProgress} onUpload={handleUpload} />
            </div>
          )}

          {/* ── Links section ────────────────────────────────────────────── */}
          {activeTab === 'links' && (
            <section className="flex flex-col flex-1 min-h-0 gap-3">
              {projectLinks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar pb-4">
                  {projectLinks
                    .filter(l => !searchQuery.trim() || l.title?.toLowerCase().includes(searchQuery.toLowerCase()) || l.url.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(link => (
                      <LinkCard key={link.id} link={link} onEdit={link => { setEditingLink(link); setLinkDialogOpen(true); }} />
                    ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-text-secondary">
                  <span className="text-4xl mb-3">🔗</span>
                  <p className="font-medium">No links added to this project yet.</p>
                </div>
              )}
            </section>
          )}

          {/* ── Files section ────────────────────────────────────────────── */}
          {activeTab.startsWith('files.') && (
            <>
              {/* Native project files (task attachments, mockups, videos) */}
              {filteredNativeFiles.length > 0 && (
                <section className="shrink-0 space-y-3 mb-6">
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest">Project Attachments</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredNativeFiles.map(file => (
                      <button
                        key={file.id}
                        onClick={() => handleNativeFileClick(file)}
                        className="group p-5 rounded-xl border border-border-color bg-glass hover:bg-glass-light hover:border-primary/50 transition-all text-left cursor-pointer"
                      >
                        <p className="font-semibold text-text-primary truncate group-hover:text-primary transition-colors">{file.name}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary px-2 py-1 bg-background/50 rounded-md">
                            {file.source.replace('_', ' ')}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Drive Files section ────────────────────────────────────────────── */}
              <section className="flex flex-col flex-1 min-h-0 gap-2">
                {/* Search / Path breadcrumb nav */}
                {navigationStack.length > 0 && (
                  <div className="flex items-center gap-2 mb-3 shrink-0">
                    <button
                      onClick={goUp}
                      className="flex items-center justify-center py-1.5 px-3 rounded-xl bg-glass border border-border-color text-sm text-text-secondary hover:text-text-primary hover:bg-glass-light transition-colors shrink-0"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                      </svg>
                      Back
                    </button>
                    <div className="flex bg-glass border border-border-color px-3 py-1.5 rounded-xl text-sm overflow-hidden flex-1 items-center gap-2">
                         <span className="text-text-secondary">/{currentPath}</span>
                    </div>
                  </div>
                )}
                <div className="flex flex-col shrink-0">
                  <FilterPanel {...filterState} availableOwners={availableOwners} />
                </div>
                
                {/* Bulk actions bar */}
                <BulkActionsBar
                  count={bulk.count}
                  selectedIds={bulk.selectedIds}
                  onClearAll={bulk.clearAll}
                  onBulkDelete={handleBulkDelete}
                  onBulkDownload={handleBulkDownload}
                />

              {/* Filter panel + chips */}
              <div className="shrink-0">
                <FilterChips {...filterState} />
              </div>

              {/* Sort headers for list/timeline */}
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

              {/* File grid / list / kanban / gallery / timeline */}
              <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 pr-1">
                {driveLoading ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-3 text-text-secondary">
                    <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <p className="text-sm">{isRefreshing ? 'Refreshing…' : 'Loading Drive files…'}</p>
                  </div>
                ) : (
                  <>
                    <FolderGrid folders={folders} onNavigate={navigateFolder} />
                    {displayDriveFiles.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 gap-2 text-text-secondary">
                        <svg className="w-12 h-12 opacity-30" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                        </svg>
                        <p className="text-sm">{searchQuery ? 'No Drive files match your search' : 'No Drive files yet'}</p>
                      </div>
                    ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-4">
                    {displayDriveFiles.map(file => (
                      <FileCard
                        key={file.id}
                        file={file}
                        viewMode="grid"
                        isSelected={bulk.isSelected(file.id)}
                        onToggleSelect={bulk.toggle}
                        onShare={setFileToShare}
                        onDelete={handleDelete}
                        onClick={() => setPreviewFile(file)}
                      />
                    ))}
                  </div>
                ) : viewMode === 'kanban' ? (
                  <KanbanView files={displayDriveFiles} onDelete={handleDelete} onSelect={setPreviewFile} />
                ) : viewMode === 'timeline' ? (
                  <TimelineView files={displayDriveFiles} onDelete={handleDelete} onSelect={setPreviewFile} />
                ) : (
                  <div className="flex flex-col pb-4">
                    {displayDriveFiles.map(file => (
                      <FileCard
                        key={file.id}
                        file={file}
                        viewMode="list"
                        isSelected={bulk.isSelected(file.id)}
                        onToggleSelect={bulk.toggle}
                        onShare={setFileToShare}
                        onDelete={handleDelete}
                        onClick={() => setPreviewFile(file)}
                      />
                    ))}
                  </div>
                )}
                  </>
                )}
              </div>
            </section>
            </>
          )}
        </div>
      </div>

      {/* ── Metadata Sidebar ──────────────────────────────────────────────────── */}
      {selectedFile && (
        <MetadataSidebar
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onDelete={handleDelete}
        />
      )}

      {/* ── File Preview Modal ────────────────────────────────────────────────── */}
      {previewFile && (
        <PreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onShowInfo={() => {
            setSelectedFile(previewFile);
          }}
        />
      )}

      {/* ── Share Dialog ──────────────────────────────────────────────────────── */}
      <ShareDialog file={fileToShare} onClose={() => setFileToShare(null)} />

      {/* ── Add/Edit Link Dialog ─────────────────────────────────────────────── */}
      <AddLinkDialog
        projectId={safeProjectId}
        open={linkDialogOpen}
        onClose={() => { setLinkDialogOpen(false); setEditingLink(undefined); }}
        editingLink={editingLink ? { id: editingLink.id, url: editingLink.url, title: editingLink.title, favicon: editingLink.favicon } : undefined}
      />
    </div>
  );
};

export default ProjectFilesPage;
