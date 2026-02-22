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

const TYPE_ROUTES: Record<string, (hit: SearchHit) => string> = {
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

  const handleClick = () => {
    const route = TYPE_ROUTES[type]?.(hit);
    if (route) navigate(route);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left px-4 py-3 rounded-xl bg-glass hover:bg-glass-light border border-border-color transition-colors"
    >
      <p className="text-sm font-medium text-text-primary truncate">{title}</p>
      {sub && <p className="text-xs text-text-secondary mt-0.5 truncate">{sub}</p>}
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Search</h1>

      <input
        autoFocus
        type="search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search projects, tasks, brands, docs…"
        className="w-full px-4 py-3 rounded-xl bg-glass border border-border-color text-text-primary placeholder-text-secondary focus:outline-none focus:border-primary text-sm mb-6"
      />

      {isSearching && (
        <p className="text-sm text-text-secondary mb-4">Searching…</p>
      )}

      {!isSearching && searchResults && searchQuery.length >= 2 && (
        <p className="text-sm text-text-secondary mb-6">
          {totalHits} result{totalHits !== 1 ? 's' : ''} in {searchResults.processingTimeMs}ms
        </p>
      )}

      {searchResults && (
        <div className="space-y-8">
          {Object.entries(searchResults.results).map(([type, { hits, estimatedTotalHits }]) => {
            if (hits.length === 0) return null;
            return (
              <section key={type}>
                <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                  {TYPE_LABELS[type] ?? type} ({estimatedTotalHits})
                </h2>
                <div className="space-y-2">
                  {hits.map((hit) => (
                    <HitCard key={String(hit.id)} type={type} hit={hit} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {!isSearching && searchResults && totalHits === 0 && searchQuery.length >= 2 && (
        <div className="text-center py-12 text-text-secondary">
          <p className="text-lg mb-2">No results for "{searchQuery}"</p>
          <p className="text-sm">Try different keywords.</p>
        </div>
      )}

      {!searchQuery && (
        <div className="text-center py-12 text-text-secondary">
          <p className="text-sm">Type at least 2 characters to search.</p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
