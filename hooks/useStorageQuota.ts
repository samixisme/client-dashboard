import { useState, useCallback, useEffect, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StorageQuota {
  used: number;        // bytes
  total: number;       // bytes (0 if unlimited)
  usedInDrive: number; // bytes
  usedInTrash: number; // bytes
  percentUsed: number; // 0–100
}

interface UseStorageQuotaReturn {
  quota: StorageQuota | null;
  isLoading: boolean;
  error: string | null;
  refreshQuota: () => Promise<void>;
}

const API_BASE = '/api/drive';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStorageQuota(): UseStorageQuotaReturn {
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const refreshQuota = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/storage`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      if (isMounted.current && body.success) {
        setQuota(body.data);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch storage quota');
      }
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, []);

  // Fetch on mount (once per session)
  useEffect(() => {
    refreshQuota();
  }, [refreshQuota]);

  return { quota, isLoading, error, refreshQuota };
}
