import { useState, useCallback, useEffect, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityAction = 'upload' | 'delete' | 'rename' | 'share' | 'move' | 'tag' | 'comment';

export interface FileActivity {
  id: string;
  fileId: string;
  fileName: string;
  action: ActivityAction;
  userId: string;
  userName?: string;
  timestamp: string;
  details?: Record<string, unknown>;
  projectId?: string;
}

interface UseActivityLogReturn {
  activities: FileActivity[];
  isLoading: boolean;
  error: string | null;
  filter: ActivityAction | 'all';
  setFilter: (action: ActivityAction | 'all') => void;
  logActivity: (event: Omit<FileActivity, 'id' | 'timestamp'>) => Promise<void>;
  fetchActivities: (projectId?: string, limit?: number) => Promise<void>;
  filteredActivities: FileActivity[];
}

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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useActivityLog(projectId: string = 'default'): UseActivityLogReturn {
  const [activities, setActivities] = useState<FileActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActivityAction | 'all'>('all');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchActivities = useCallback(async (pid?: string, limit: number = 50) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ success: boolean; data: { activities: FileActivity[] } }>(
        `/activity?projectId=${encodeURIComponent(pid || projectId)}&limit=${limit}`
      );
      if (isMounted.current && res.success) {
        setActivities(res.data.activities);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch activities');
      }
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [projectId]);

  // Load activities on mount
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  /**
   * Log an activity event. Non-blocking — failures are silently caught
   * so they don't interfere with the primary file operation.
   */
  const logActivity = useCallback(async (event: Omit<FileActivity, 'id' | 'timestamp'>) => {
    try {
      await apiFetch<{ success: boolean }>('/activity', {
        method: 'POST',
        body: JSON.stringify({ ...event, projectId: event.projectId || projectId }),
      });
      // Optimistically add to local state
      if (isMounted.current) {
        const newActivity: FileActivity = {
          ...event,
          id: `temp-${Date.now()}`,
          timestamp: new Date().toISOString(),
        };
        setActivities((prev) => [newActivity, ...prev].slice(0, 100));
      }
    } catch {
      // Non-blocking: activity logging failures don't affect primary operations
    }
  }, [projectId]);

  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter((a) => a.action === filter);

  return {
    activities,
    isLoading,
    error,
    filter,
    setFilter,
    logActivity,
    fetchActivities,
    filteredActivities,
  };
}
