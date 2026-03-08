import { useState, useCallback, useEffect, useRef } from 'react';
import { FileTag } from '../types/drive';

const API_BASE = '/api/drive';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseFileTagsReturn {
  tags: FileTag[];
  isLoading: boolean;
  error: string | null;
  createTag: (name: string, color?: string, projectId?: string) => Promise<FileTag | null>;
  deleteTag: (tagId: string) => Promise<void>;
  assignTag: (fileId: string, tagId: string) => Promise<void>;
  removeTag: (fileId: string, tagId: string) => Promise<void>;
  getFileTags: (fileId: string) => Promise<FileTag[]>;
  searchTags: (query: string) => FileTag[];
  updateTagColor: (tagId: string, color: string) => Promise<void>;
  refreshTags: () => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFileTags(projectId: string = 'default'): UseFileTagsReturn {
  const [tags, setTags] = useState<FileTag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Fetch all tags for this project
  const refreshTags = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ success: boolean; data: { tags: FileTag[] } }>(
        `/tags?projectId=${encodeURIComponent(projectId)}`
      );
      if (isMounted.current && res.success) {
        setTags(res.data.tags);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch tags');
      }
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [projectId]);

  // Load tags on mount
  useEffect(() => {
    refreshTags();
  }, [refreshTags]);

  const createTag = useCallback(async (name: string, color?: string, pid?: string): Promise<FileTag | null> => {
    try {
      const res = await apiFetch<{ success: boolean; data: FileTag }>(
        '/tags',
        {
          method: 'POST',
          body: JSON.stringify({ name, color, projectId: pid || projectId }),
        }
      );
      if (res.success) {
        const newTag = res.data;
        setTags((prev) => {
          // Avoid duplicates
          if (prev.some((t) => t.id === newTag.id)) return prev;
          return [...prev, newTag];
        });
        return newTag;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag');
      return null;
    }
  }, [projectId]);

  const deleteTag = useCallback(async (tagId: string) => {
    try {
      await apiFetch<{ success: boolean }>(`/tags/${tagId}`, { method: 'DELETE' });
      setTags((prev) => prev.filter((t) => t.id !== tagId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag');
    }
  }, []);

  const assignTag = useCallback(async (fileId: string, tagId: string) => {
    await apiFetch<{ success: boolean }>(
      `/files/${fileId}/tags`,
      { method: 'POST', body: JSON.stringify({ tagId }) }
    );
  }, []);

  const removeTag = useCallback(async (fileId: string, tagId: string) => {
    await apiFetch<{ success: boolean }>(
      `/files/${fileId}/tags/${tagId}`,
      { method: 'DELETE' }
    );
  }, []);

  const getFileTags = useCallback(async (fileId: string): Promise<FileTag[]> => {
    try {
      const res = await apiFetch<{ success: boolean; data: { tags: FileTag[] } }>(
        `/files/${fileId}/tags`
      );
      return res.success ? res.data.tags : [];
    } catch {
      return [];
    }
  }, []);

  const searchTags = useCallback((query: string): FileTag[] => {
    if (!query.trim()) return tags;
    const lower = query.toLowerCase();
    return tags
      .filter((t) => t.name.toLowerCase().includes(lower))
      .slice(0, 10);
  }, [tags]);

  const updateTagColor = useCallback(async (tagId: string, color: string) => {
    // No dedicated endpoint — recreate by updating local + Firestore via create
    // For now we update local state; a proper PATCH endpoint could be added later
    setTags((prev) =>
      prev.map((t) => (t.id === tagId ? { ...t, color } : t))
    );
  }, []);

  return {
    tags,
    isLoading,
    error,
    createTag,
    deleteTag,
    assignTag,
    removeTag,
    getFileTags,
    searchTags,
    updateTagColor,
    refreshTags,
  };
}
