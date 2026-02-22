import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSearch } from '../contexts/SearchContext';
import { SearchHit } from '../utils/search';

const TYPE_LABELS: Record<string, string> = {
  projects: 'Projects',
  tasks: 'Tasks',
  brands: 'Brands',
  invoices: 'Invoices',
  clients: 'Clients',
  docs: 'Docs',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  projects: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
    </svg>
  ),
  tasks: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  brands: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  invoices: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  clients: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  docs: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

const TYPE_ROUTES: Record<string, (hit: SearchHit) => string | null> = {
  projects: () => '/projects',
  tasks: (h) => `/board/${h.boardId ?? ''}`,
  brands: (h) => `/brands/${h.id}`,
  invoices: () => '/payments',
  clients: () => '/payments',
  docs: (h) => `/docs/${h.projectId ?? ''}/${h.id}`,
};

function HitCard({ type, hit }: { type: string; hit: SearchHit }) {
  const navigate = useNavigate();
  const title = String(hit.name ?? hit.title ?? hit.invoiceNumber ?? hit.id ?? '');
  const sub = String(hit.status ?? hit.industry ?? hit.mode ?? '');
  const route = TYPE_ROUTES[type]?.(hit) ?? null;

  const handleClick = () => {
    if (route) navigate(route);
  };

  return (
    <button
      onClick={handleClick}
      disabled={!route}
      className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-150 group flex items-start gap-3
        ${route
          ? 'bg-glass hover:bg-glass-light border-border-color hover:border-primary/30 cursor-pointer hover:shadow-[0_0_12px_rgba(163,230,53,0.08)]'
          : 'bg-glass border-border-color opacity-50 cursor-default'
        }`}
    >
      <span className="mt-0.5 text-text-secondary group-hover:text-primary transition-colors duration-150 flex-shrink-0">
        {TYPE_ICONS[type]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate group-hover:text-primary transition-colors duration-150">
          {title}
        </p>
        {sub && (
          <p className="text-xs text-text-secondary mt-0.5 truncate capitalize">{sub}</p>
        )}
      </div>
      {route && (
        <svg className="w-4 h-4 text-text-secondary group-hover:text-primary transition-colors duration-150 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
}

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { searchQuery, setSearchQuery, searchResults, isSearching } = useSearch();

  // Sync ?q= param into the shared search context on mount
  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    if (q && q !== searchQuery) setSearchQuery(q);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep URL in sync with query
  useEffect(() => {
    setSearchParams(searchQuery ? { q: searchQuery } : {}, { replace: true });
  }, [searchQuery, setSearchParams]);

  const totalHits = searchResults
    ? Object.values(searchResults.results).reduce((s, r) => s + r.estimatedTotalHits, 0)
    : 0;

  const hasResults = searchResults && Object.values(searchResults.results).some(r => r.hits.length > 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary mb-1">Search</h1>
        <p className="text-sm text-text-secondary">Search across projects, tasks, brands, docs and more</p>
      </div>

      {/* Search input */}
      <div className="relative mb-6">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          autoFocus
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search projects, tasks, brands, docs…"
          className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-glass border border-border-color text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary/50 focus:shadow-[0_0_0_3px_rgba(163,230,53,0.08)] text-sm transition-all duration-200"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-glass-light transition-colors duration-150 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Status bar */}
      {isSearching && (
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-6">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          Searching…
        </div>
      )}

      {!isSearching && searchResults && searchQuery.length >= 2 && (
        <p className="text-xs text-text-secondary mb-6">
          {totalHits} result{totalHits !== 1 ? 's' : ''} · {searchResults.processingTimeMs}ms
        </p>
      )}

      {/* Results */}
      {hasResults && (
        <div className="space-y-6">
          {Object.entries(searchResults!.results).map(([type, { hits, estimatedTotalHits }]) => {
            if (hits.length === 0) return null;
            return (
              <section key={type}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-text-secondary">{TYPE_ICONS[type]}</span>
                  <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {TYPE_LABELS[type] ?? type}
                  </h2>
                  <span className="text-xs text-text-secondary/50 font-normal ml-auto">
                    {estimatedTotalHits}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {hits.map((hit) => (
                    <HitCard key={String(hit.id)} type={type} hit={hit} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!isSearching && searchResults && totalHits === 0 && searchQuery.length >= 2 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-glass border border-border-color flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-text-primary font-medium mb-1">No results for "{searchQuery}"</p>
          <p className="text-sm text-text-secondary">Try different keywords or check the spelling.</p>
        </div>
      )}

      {/* Idle state */}
      {!searchQuery && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-glass border border-border-color flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-text-primary font-medium mb-1">Start searching</p>
          <p className="text-sm text-text-secondary">Type at least 2 characters to see results.</p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
