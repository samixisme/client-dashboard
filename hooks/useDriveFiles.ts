import { useState, useEffect, useCallback, useRef } from 'react';
import { DriveFile, DriveFolder, DriveStatsResponse } from '../types/drive';
import { useActivityLog } from './useActivityLog';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : 'https://client.samixism.com');
const DRIVE_API_PATH = `${API_BASE}/api/drive`;

const AUTO_REFRESH_LS_KEY = 'files_auto_refresh_enabled';
const POLL_INTERVAL_MS = 30_000;
const REFRESH_DEBOUNCE_MS = 2_000;

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${DRIVE_API_PATH}${path}`, {
    credentials: 'include',
    ...options,
  });
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error('API server is not reachable. Make sure both dev servers are running (npm run dev).');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseDriveFilesOptions {
  projectId?: string;
  initialPath?: string;
}

export interface UseDriveFilesReturn {
  files: DriveFile[];
  folders: DriveFolder[];
  stats: DriveStatsResponse | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isUploading: boolean;
  uploadProgress: number; // 0-100
  error: string | null;
  currentPath: string;
  autoRefreshEnabled: boolean;
  lastRefreshTime: Date | undefined;
  // Actions
  navigate: (path: string) => void;
  goUp: () => void;
  refresh: () => void;
  toggleAutoRefresh: () => void;
  upload: (file: File) => Promise<void>;
  remove: (fileId: string) => Promise<void>;
  rename: (fileId: string, newName: string) => Promise<void>;
  move: (fileId: string, targetFolderPath: string) => Promise<void>;
  createFolder: (folderName: string) => Promise<void>;
}

export function useDriveFiles(
  optionsOrPath: UseDriveFilesOptions | string = ''
): UseDriveFilesReturn {
  // Normalise: accept legacy positional string or new options object
  const options: UseDriveFilesOptions =
    typeof optionsOrPath === 'string'
      ? { initialPath: optionsOrPath }
      : optionsOrPath;
  const { projectId, initialPath = '' } = options;

  const { logActivity } = useActivityLog(projectId || 'default');

  const [currentPath, setCurrentPath] = useState(initialPath);
  const [files, setFiles]       = useState<DriveFile[]>([]);
  const [folders, setFolders]   = useState<DriveFolder[]>([]);
  const [stats, setStats]       = useState<DriveStatsResponse | null>(null);
  const [isLoading, setIsLoading]         = useState(false);
  const [isRefreshing, setIsRefreshing]   = useState(false);
  const [isUploading, setIsUploading]     = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | undefined>(undefined);

  // Auto-refresh: read persisted preference from localStorage
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTO_REFRESH_LS_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Refs for debounce and interval management
  const lastRefreshCallRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLoadingRef = useRef(isLoading);
  const isUploadingRef = useRef(isUploading);

  // Keep refs in sync with state so the interval closure sees current values
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);
  useEffect(() => { isUploadingRef.current = isUploading; }, [isUploading]);

  // ── Fetch file list ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    if (refreshTick > 0) setIsRefreshing(true);
    setError(null);

    const projectParam = projectId ? `&projectId=${encodeURIComponent(projectId)}` : '';
    const query = currentPath ? `?folder=${encodeURIComponent(currentPath)}${projectParam}` : (projectParam ? `?projectId=${encodeURIComponent(projectId!)}` : '');

    Promise.all([
      apiFetch<{ files: DriveFile[]; folders: DriveFolder[] }>(`/files${query}`),
      apiFetch<DriveStatsResponse>('/stats'),
    ])
      .then(([listing, quotaStats]) => {
        if (cancelled) return;
        setFiles(listing.files ?? []);
        setFolders(listing.folders ?? []);
        setStats(quotaStats);
        setLastRefreshTime(new Date());
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message ?? 'Failed to load files');
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      });

    return () => { cancelled = true; };
  }, [currentPath, refreshTick]);

  // ── Auto-polling interval ────────────────────────────────────────────────────
  useEffect(() => {
    const clearPoll = () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    if (!autoRefreshEnabled) {
      clearPoll();
      return;
    }

    intervalRef.current = setInterval(() => {
      // Skip if a load or upload is already in flight, or page is hidden
      if (isLoadingRef.current || isUploadingRef.current || document.hidden) return;
      setRefreshTick(t => t + 1);
    }, POLL_INTERVAL_MS);

    // Pause polling when tab is hidden, resume when visible
    const handleVisibility = () => {
      if (document.hidden) {
        clearPoll();
      } else if (autoRefreshEnabled) {
        intervalRef.current = setInterval(() => {
          if (isLoadingRef.current || isUploadingRef.current || document.hidden) return;
          setRefreshTick(t => t + 1);
        }, POLL_INTERVAL_MS);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearPoll();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [autoRefreshEnabled]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const navigate = useCallback((path: string) => {
    setCurrentPath(path);
  }, []);

  const goUp = useCallback(() => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.join('/'));
  }, [currentPath]);

  // Debounced refresh: ignores calls within REFRESH_DEBOUNCE_MS of each other
  const refresh = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshCallRef.current < REFRESH_DEBOUNCE_MS) return;
    lastRefreshCallRef.current = now;
    setRefreshTick(t => t + 1);
  }, []);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefreshEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem(AUTO_REFRESH_LS_KEY, String(next));
      } catch {
        // localStorage may be unavailable in some environments
      }
      return next;
    });
  }, []);

  // ── Upload ──────────────────────────────────────────────────────────────────
  const upload = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      let uploadPath = currentPath;
      if (!uploadPath && projectId) {
        uploadPath = `projects/${projectId}`;
      }
      
      if (uploadPath) {
        formData.append('folder', uploadPath);
      }

      const { uploadToDrive } = await import('../utils/driveUpload');
      await uploadToDrive(
        file,
        uploadPath,
        file.name,
        (progress) => setUploadProgress(progress)
      );

      logActivity({
        fileId: 'new', // Since uploadToDrive doesn't return ID directly yet, though we could fix that later
        fileName: file.name,
        action: 'upload',
        userId: 'local',
        projectId
      }).catch(() => {});

      setRefreshTick(t => t + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      throw err;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [currentPath, projectId]);

  // ── Delete ──────────────────────────────────────────────────────────────────
  const remove = useCallback(async (fileId: string) => {
    setError(null);
    // Optimistic update — snapshot for rollback on failure
    const snapshot = files;
    const fileToRemove = files.find(f => f.id === fileId);
    setFiles(prev => prev.filter(f => f.id !== fileId));
    try {
      await apiFetch(`/files/${fileId}`, { method: 'DELETE' });
      if (fileToRemove) {
        logActivity({
          fileId,
          fileName: fileToRemove.name,
          action: 'delete',
          userId: 'local',
          projectId
        }).catch(() => {});
      }
    } catch (err) {
      // Roll back optimistic removal
      setFiles(snapshot);
      setError(err instanceof Error ? err.message : 'Failed to delete file');
      throw err;
    }
  }, [files]);

  // ── Rename ──────────────────────────────────────────────────────────────────
  const rename = useCallback(async (fileId: string, newName: string) => {
    setError(null);
    try {
      await apiFetch(`/files/${fileId}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      const file = files.find(f => f.id === fileId);
      if (file) {
        logActivity({
          fileId,
          fileName: file.name,
          action: 'rename',
          userId: 'local',
          details: { oldName: file.name, newName },
          projectId
        }).catch(() => {});
      }
      setRefreshTick(t => t + 1); // Trigger refresh to get updated files
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename file');
      throw err;
    }
  }, []);

  // ── Move ────────────────────────────────────────────────────────────────────
  const move = useCallback(async (fileId: string, targetFolderPath: string) => {
    setError(null);
    try {
      // 1. Resolve folder path to ID
      const folderRes = await apiFetch<{ folderId: string; path: string }>(
        `/folders?path=${encodeURIComponent(targetFolderPath)}`
      );
      
      // 2. Perform move
      await apiFetch(`/files/${fileId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: folderRes.folderId }),
      });
      
      const file = files.find(f => f.id === fileId);
      if (file) {
        logActivity({
          fileId,
          fileName: file.name,
          action: 'move',
          userId: 'local',
          details: { targetFolderPath },
          projectId
        }).catch(() => {});
      }

      setRefreshTick(t => t + 1); // Trigger refresh
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move file');
      throw err;
    }
  }, []);

  // ── Create Folder ───────────────────────────────────────────────────────────
  const createFolder = useCallback(async (folderName: string) => {
    setError(null);
    try {
      const targetPath = currentPath ? `${currentPath}/${folderName}` : folderName;
      await apiFetch(`/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: targetPath }),
      });
      setRefreshTick(t => t + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
      throw err;
    }
  }, [currentPath]);

  return {
    files,
    folders,
    stats,
    isLoading,
    isRefreshing,
    isUploading,
    uploadProgress,
    error,
    currentPath,
    autoRefreshEnabled,
    lastRefreshTime,
    navigate,
    goUp,
    refresh,
    toggleAutoRefresh,
    upload,
    remove,
    rename,
    move,
    createFolder,
  };
}
