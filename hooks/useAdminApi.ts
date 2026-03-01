import { useState, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { toast } from 'sonner';

const BASE_URL = '/admin/api';

/** Shape every backend admin route returns */
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: { total: number; hasMore?: boolean; page?: number };
}

/** What the hook exposes */
interface UseAdminApiReturn {
  loading: boolean;
  get: <T>(path: string, params?: Record<string, string | number | boolean>) => Promise<T | null>;
  post: <T>(path: string, body: unknown) => Promise<T | null>;
  put: <T>(path: string, body: unknown) => Promise<T | null>;
  patch: <T>(path: string, body: unknown) => Promise<T | null>;
  del: <T>(path: string, body?: unknown) => Promise<T | null>;
  bulkDelete: <T>(path: string, ids: string[]) => Promise<T | null>;
}

/**
 * Shared hook for all Admin CMS API calls.
 *
 * - Automatically injects Firebase ID token as `Authorization: Bearer <token>`
 * - Auto-refreshes expired token (getIdToken handles this natively)
 * - Tracks global loading state
 * - Shows sonner toast on any error
 * - Returns null on error (never throws)
 *
 * Usage:
 * ```tsx
 * const { get, post, del, loading } = useAdminApi();
 * const users = await get<User[]>('/users', { limit: 25, page: 1 });
 * const created = await post<User>('/users', { email: 'a@b.com', role: 'admin' });
 * await del('/users/uid123');
 * await bulkDelete('/users', ['uid1', 'uid2']);
 * ```
 */
export function useAdminApi(): UseAdminApiReturn {
  const [loading, setLoading] = useState(false);

  const getToken = useCallback(async (): Promise<string | null> => {
    const currentUser = getAuth().currentUser;
    if (!currentUser) {
      toast.error('Not authenticated. Please sign in.');
      return null;
    }
    try {
      return await currentUser.getIdToken(false);
    } catch {
      toast.error('Session expired. Please sign in again.');
      return null;
    }
  }, []);

  const buildHeaders = useCallback(
    async (includeBody = false): Promise<HeadersInit | null> => {
      const token = await getToken();
      if (!token) return null;
      const headers: HeadersInit = { Authorization: `Bearer ${token}` };
      if (includeBody) headers['Content-Type'] = 'application/json';
      return headers;
    },
    [getToken]
  );

  const request = useCallback(
    async <T>(
      method: string,
      path: string,
      body?: unknown,
      params?: Record<string, string | number | boolean>
    ): Promise<T | null> => {
      setLoading(true);
      try {
        const headers = await buildHeaders(body !== undefined);
        if (!headers) return null;

        let url = `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
        if (params && Object.keys(params).length > 0) {
          const qs = new URLSearchParams(
            Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
          ).toString();
          url += `?${qs}`;
        }

        const res = await fetch(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });

        const json: ApiResponse<T> = await res.json();

        if (!res.ok || !json.success) {
          const message = json.error ?? `Request failed: ${res.status} ${res.statusText}`;
          toast.error(message);
          return null;
        }

        return (json.data ?? null) as T | null;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Network error');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [buildHeaders]
  );

  const get = useCallback(
    <T>(path: string, params?: Record<string, string | number | boolean>) =>
      request<T>('GET', path, undefined, params),
    [request]
  );

  const post = useCallback(
    <T>(path: string, body: unknown) => request<T>('POST', path, body),
    [request]
  );

  const put = useCallback(
    <T>(path: string, body: unknown) => request<T>('PUT', path, body),
    [request]
  );

  const patch = useCallback(
    <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
    [request]
  );

  const del = useCallback(
    <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
    [request]
  );

  const bulkDelete = useCallback(
    <T>(path: string, ids: string[]) => request<T>('DELETE', path, { ids }),
    [request]
  );

  return { loading, get, post, put, patch, del, bulkDelete };
}
