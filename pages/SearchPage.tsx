import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { globalSearch, SearchResults } from '../utils/search';

const TYPE_LABELS: Record<string, string> = {
  projects: 'Projects',
  tasks: 'Tasks',
  brands: 'Brands',
  feedback_items: 'Feedback',
  invoices: 'Invoices',
  clients: 'Clients',
  docs: 'Docs',
  drive_files: 'Drive Files',
};

const ALL_TYPES = Object.keys(TYPE_LABELS);

const TYPE_ROUTES: Record<string, (hit: Record<string, unknown>) => string> = {
  projects: (h) => `/projects`,
  tasks: (h) => `/board/${h.boardId ?? ''}`,
  brands: (h) => `/brands/${h.id}`,
  feedback_items: (h) => `/feedback/${h.projectId ?? ''}`,
  invoices: (h) => `/payments`,
  clients: (h) => `/payments`,
  docs: (h) => `/docs/${h.projectId ?? ''}/${h.id}`,
  drive_files: () => '',
};

function highlight(text: string | undefined, fallback: string) {
  if (!text) return <span>{fallback}</span>;
  // text may contain <mark>…</mark> from Meilisearch
  return <span dangerouslySetInnerHTML={{ __html: text }} />;
}

function HitCard({
  type,
  hit,
}: {
  type: string;
  hit: Record<string, unknown>;
}) {
  const navigate = useNavigate();
  const fmt = (hit._formatted ?? {}) as Record<string, string>;
  const title = fmt.name ?? fmt.title ?? fmt.invoiceNumber ?? String(hit.name ?? hit.title ?? hit.invoiceNumber ?? hit.id ?? '');
  const sub = fmt.description ?? fmt.status ?? fmt.mimeType ?? '';
  const isDrive = type === 'drive_files';

  const handleClick = () => {
    if (isDrive) {
      window.open(String(hit.webViewLink ?? ''), '_blank', 'noopener');
      return;
    }
    const route = TYPE_ROUTES[type]?.(hit);
    if (route) navigate(route);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left px-4 py-3 rounded-xl bg-glass hover:bg-glass-light border border-border-color transition-colors"
    >
      <p className="text-sm font-medium text-text-primary truncate">
        {highlight(title, String(hit.id))}
      </p>
      {sub && (
        <p className="text-xs text-text-secondary mt-0.5 truncate">
          {highlight(sub, '')}
        </p>
      )}
      {isDrive && (
        <p className="text-xs text-primary mt-0.5">Open in Drive ↗</p>
      )}
    </button>
  );
}

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQ);
  const [activeType, setActiveType] = useState<string>('all');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_LIMIT = 10;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(
    async (q: string, type: string, p: number) => {
      if (q.length < 2) {
        setResults(null);
        return;
      }
      setIsSearching(true);
      try {
        const types = type === 'all' ? undefined : [type];
        const data = await globalSearch(q, types, p, PAGE_LIMIT);
        setResults(data);
      } catch {
        // silent
      } finally {
        setIsSearching(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(0);
      doSearch(query, activeType, 0);
      setSearchParams(query ? { q: query } : {}, { replace: true });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, activeType, doSearch, setSearchParams]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    doSearch(query, activeType, next);
  };

  const totalHits = results
    ? Object.values(results.results).reduce((s, r) => s + r.estimatedTotalHits, 0)
    : 0;

  const hasMore = results
    ? Object.values(results.results).some(
        (r) => r.hits.length === PAGE_LIMIT,
      )
    : false;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Search</h1>

      {/* Search input */}
      <input
        autoFocus
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search projects, tasks, brands, files…"
        className="w-full px-4 py-3 rounded-xl bg-glass border border-border-color text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary text-sm mb-4"
      />

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveType('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            activeType === 'all'
              ? 'bg-primary text-background'
              : 'bg-glass border border-border-color text-text-secondary hover:text-text-primary'
          }`}
        >
          All
        </button>
        {ALL_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeType === t
                ? 'bg-primary text-background'
                : 'bg-glass border border-border-color text-text-secondary hover:text-text-primary'
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Status */}
      {isSearching && (
        <p className="text-sm text-text-secondary mb-4">Searching…</p>
      )}
      {!isSearching && results && query.length >= 2 && (
        <p className="text-sm text-text-secondary mb-4">
          {totalHits} result{totalHits !== 1 ? 's' : ''} in {results.processingTimeMs}ms
        </p>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-8">
          {Object.entries(results.results).map(([type, { hits, estimatedTotalHits }]) => {
            if (hits.length === 0) return null;
            return (
              <section key={type}>
                <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                  {TYPE_LABELS[type]} ({estimatedTotalHits})
                </h2>
                <div className="space-y-2">
                  {hits.map((hit) => (
                    <HitCard key={String(hit.id)} type={type} hit={hit as Record<string, unknown>} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!isSearching && results && totalHits === 0 && query.length >= 2 && (
        <div className="text-center py-12 text-text-secondary">
          <p className="text-lg mb-2">No results for "{query}"</p>
          <p className="text-sm">Try different keywords or broaden your filter.</p>
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <button
          onClick={loadMore}
          className="mt-8 w-full py-3 rounded-xl bg-glass border border-border-color text-text-secondary hover:text-text-primary text-sm transition-colors"
        >
          Load more
        </button>
      )}
    </div>
  );
};

export default SearchPage;
