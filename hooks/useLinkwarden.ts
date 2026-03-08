import { useState, useEffect, useCallback, useRef } from 'react';
import type { LinkwardenLink, LinkwardenCollection, LinkwardenPaginationMeta } from '../lib/linkwarden';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : 'https://client.samixism.com');
const PAGE_SIZE = 24;

export interface UseLinkwardenState {
  links: LinkwardenLink[];
  collections: LinkwardenCollection[];
  pagination: LinkwardenPaginationMeta | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;

  // Search / filter state
  query: string;
  setQuery: (q: string) => void;
  collectionId: number | null;
  setCollectionId: (id: number | null) => void;

  // Actions
  refresh: () => void;
  loadMore: () => void;
}

export function useLinkwarden(): UseLinkwardenState {
  const [links, setLinks]           = useState<LinkwardenLink[]>([]);
  const [collections, setCollections] = useState<LinkwardenCollection[]>([]);
  const [pagination, setPagination] = useState<LinkwardenPaginationMeta | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [query, setQuery_]          = useState('');
  const [collectionId, setCollectionId_] = useState<number | null>(null);
  const [skip, setSkip]             = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  // Debounced query state
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const setQuery = useCallback((q: string) => { setQuery_(q); setSkip(0); }, []);
  const setCollectionId = useCallback((id: number | null) => { setCollectionId_(id); setSkip(0); }, []);
  const refresh = useCallback(() => { setSkip(0); setRefreshTick(t => t + 1); }, []);
  const loadMore = useCallback(() => {
    if (pagination?.hasMore && !isLoadingMore) {
      setSkip(s => s + PAGE_SIZE);
    }
  }, [pagination, isLoadingMore]);

  // Fetch collections once
  useEffect(() => {
    fetch(`${API_BASE}/api/linkwarden/collections`)
      .then(r => r.json())
      .then(data => {
        if (data.error) return;
        const raw: { response?: { id: number; name: string; description?: string | null }[] } = data;
        if (Array.isArray(raw.response)) {
          setCollections(raw.response.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description ?? null,
          })));
        }
      })
      .catch(() => { /* silently skip */ });
  }, []);

  // Fetch links whenever query/filter/skip changes
  useEffect(() => {
    const isAppend = skip > 0;

    if (!isAppend) setIsLoading(true);
    else setIsLoadingMore(true);
    setError(null);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const params = new URLSearchParams();
    if (debouncedQuery.trim()) params.set('searchQueryString', debouncedQuery.trim());
    if (collectionId !== null)  params.set('collectionId', String(collectionId));
    params.set('take', String(PAGE_SIZE));
    if (skip > 0) params.set('skip', String(skip));

    fetch(`${API_BASE}/api/linkwarden/links?${params.toString()}`, { signal: abortRef.current.signal })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }

        const raw: { response?: RawLink[] } = data;
        const rawLinks = Array.isArray(raw.response) ? raw.response : [];
        const parsed = rawLinks.map(parseLink);

        if (isAppend) {
          setLinks(prev => [...prev, ...parsed]);
        } else {
          setLinks(parsed);
        }

        setPagination({
          currentOffset: skip,
          pageSize: PAGE_SIZE,
          resultCount: parsed.length,
          hasMore: parsed.length >= PAGE_SIZE,
        });
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setError('Failed to load links. Check your connection.');
      })
      .finally(() => {
        setIsLoading(false);
        setIsLoadingMore(false);
      });

    return () => abortRef.current?.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, collectionId, skip, refreshTick]);

  return {
    links, collections, pagination,
    isLoading, isLoadingMore, error,
    query, setQuery,
    collectionId, setCollectionId,
    refresh, loadMore,
  };
}

// ── helpers ──────────────────────────────────────────────────────────────────

interface RawLink {
  id: number | string;
  name?: string;
  url?: string;
  type?: string;
  description?: string | null;
  createdAt?: string;
}

function parseLink(r: RawLink): LinkwardenLink {
  const id = typeof r.id === 'string' ? Number(r.id) : r.id;
  const createdAt = r.createdAt ? new Date(r.createdAt) : null;
  const validDate = createdAt && !isNaN(createdAt.getTime()) ? createdAt : null;
  let domain = '';
  try { domain = new URL(r.url ?? '').hostname; } catch { domain = r.url ?? ''; }

  return {
    id,
    name: r.name ?? '',
    url: r.url ?? '',
    type: r.type ?? 'url',
    description: r.description ?? '',
    createdAt: validDate,
    createdAtFormatted: validDate
      ? validDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '',
    domain,
  };
}
