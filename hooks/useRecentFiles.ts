import { useState, useEffect, useRef } from 'react';
import { DriveFile } from '../types/drive';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : 'https://client.samixism.com');
const DRIVE_API = `${API_BASE}/api/drive`;
const CACHE_TTL_MS = 60_000; // 60-second cache

let cachedFiles: DriveFile[] | null = null;
let cachedAt = 0;

export interface UseRecentFilesReturn {
  recentFiles: DriveFile[];
  isLoading: boolean;
  error: string | null;
}

/**
 * DES-87 — Fetches the last 10 recently modified files.
 * Results are cached for 60 seconds to avoid excessive API calls.
 */
export function useRecentFiles(): UseRecentFilesReturn {
  const [recentFiles, setRecentFiles] = useState<DriveFile[]>(cachedFiles ?? []);
  const [isLoading, setIsLoading]     = useState(cachedFiles === null);
  const [error, setError]             = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Serve from cache if still fresh
    if (cachedFiles !== null && Date.now() - cachedAt < CACHE_TTL_MS) {
      setRecentFiles(cachedFiles);
      setIsLoading(false);
      return;
    }

    abortRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(`${DRIVE_API}/files/recent`, {
      credentials: 'include',
      signal: abortRef.current.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load recent files');
        const json = await res.json() as { success: boolean; data?: { files: DriveFile[] }; error?: string };
        if (!json.success || !json.data) throw new Error(json.error ?? 'Unknown error');
        cachedFiles = json.data.files;
        cachedAt = Date.now();
        setRecentFiles(json.data.files);
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setIsLoading(false));

    return () => { abortRef.current?.abort(); };
  }, []);

  return { recentFiles, isLoading, error };
}
