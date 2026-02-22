import { useState, useEffect, useCallback } from 'react';
import { DriveFile, DriveFolder, DriveStatsResponse } from '../types/drive';

const API_BASE = '/api/drive';

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseDriveFilesReturn {
  files: DriveFile[];
  folders: DriveFolder[];
  stats: DriveStatsResponse | null;
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: number; // 0-100
  error: string | null;
  currentPath: string;
  // Actions
  navigate: (path: string) => void;
  goUp: () => void;
  refresh: () => void;
  upload: (file: File) => Promise<void>;
  remove: (fileId: string) => Promise<void>;
}

export function useDriveFiles(initialPath = ''): UseDriveFilesReturn {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [files, setFiles]       = useState<DriveFile[]>([]);
  const [folders, setFolders]   = useState<DriveFolder[]>([]);
  const [stats, setStats]       = useState<DriveStatsResponse | null>(null);
  const [isLoading, setIsLoading]     = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // ── Fetch file list ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const query = currentPath ? `?folder=${encodeURIComponent(currentPath)}` : '';

    Promise.all([
      apiFetch<{ files: DriveFile[]; folders: DriveFolder[] }>(`/files${query}`),
      apiFetch<DriveStatsResponse>('/stats'),
    ])
      .then(([listing, quotaStats]) => {
        if (cancelled) return;
        setFiles(listing.files ?? []);
        setFolders(listing.folders ?? []);
        setStats(quotaStats);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message ?? 'Failed to load files');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [currentPath, refreshTick]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const navigate = useCallback((path: string) => {
    setCurrentPath(path);
  }, []);

  const goUp = useCallback(() => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.join('/'));
  }, [currentPath]);

  const refresh = useCallback(() => {
    setRefreshTick(t => t + 1);
  }, []);

  // ── Upload ──────────────────────────────────────────────────────────────────
  const upload = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (currentPath) formData.append('folder', currentPath);

      // Use XHR for real upload progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE}/upload`);
        xhr.withCredentials = true;

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            try {
              const body = JSON.parse(xhr.responseText);
              reject(new Error(body.error || `Upload failed: ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(formData);
      });

      setRefreshTick(t => t + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      throw err;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [currentPath]);

  // ── Delete ──────────────────────────────────────────────────────────────────
  const remove = useCallback(async (fileId: string) => {
    setError(null);
    // Optimistic update — snapshot for rollback on failure
    const snapshot = files;
    setFiles(prev => prev.filter(f => f.id !== fileId));
    try {
      await apiFetch(`/files/${fileId}`, { method: 'DELETE' });
    } catch (err) {
      // Roll back optimistic removal
      setFiles(snapshot);
      setError(err instanceof Error ? err.message : 'Failed to delete file');
      throw err;
    }
  }, [files]);

  return {
    files,
    folders,
    stats,
    isLoading,
    isUploading,
    uploadProgress,
    error,
    currentPath,
    navigate,
    goUp,
    refresh,
    upload,
    remove,
  };
}
