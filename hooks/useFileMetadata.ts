import { useState, useEffect, useCallback } from 'react';
import { DriveFile, DriveRevision } from '../types/drive';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : 'https://client.samixism.com');
const DRIVE_API_PATH = `${API_BASE}/api/drive`;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${DRIVE_API_PATH}${path}`, {
    credentials: 'include',
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function useFileMetadata(fileId: string | null) {
  const [metadata, setMetadata] = useState<DriveFile | null>(null);
  const [revisions, setRevisions] = useState<DriveRevision[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetadata = useCallback(async () => {
    if (!fileId) {
      setMetadata(null);
      setRevisions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Revisions might fail if not supported or missing permissions, so we catch its error and return empty
      const [metaRes, revRes] = await Promise.all([
        apiFetch<DriveFile>(`/files/${fileId}/meta`),
        apiFetch<{ revisions: DriveRevision[] }>(`/files/${fileId}/revisions`).catch(() => ({ revisions: [] }))
      ]);
      setMetadata(metaRes);
      setRevisions(revRes.revisions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file metadata');
    } finally {
      setIsLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  const revertToRevision = async (revisionId: string) => {
    if (!fileId) return;
    try {
      await apiFetch(`/files/${fileId}/revisions/${revisionId}/revert`, { method: 'POST' });
      await fetchMetadata(); // refresh
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to revert revision');
    }
  };

  return {
    metadata,
    revisions,
    isLoading,
    error,
    refresh: fetchMetadata,
    revertToRevision
  };
}
