import React, { useState, useCallback } from 'react';
import { useLinkwarden } from '../hooks/useLinkwarden';
import type { LinkwardenLink } from '../lib/linkwarden';
import {
  Search, RefreshCw, ExternalLink, Folder,
  Link2, Calendar, Globe, X, LayoutGrid, List,
  ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';

// ── Link card ─────────────────────────────────────────────────────────────────

const LinkCard: React.FC<{
  link: LinkwardenLink;
  viewMode: 'grid' | 'list';
}> = ({ link, viewMode }) => {
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${link.domain}&sz=32`;

  if (viewMode === 'list') {
    return (
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-4 px-4 py-3 rounded-xl border border-border-color bg-glass hover:bg-glass-light hover:border-primary/40 transition-all duration-200 cursor-pointer"
        aria-label={`Open ${link.name}`}
      >
        {/* Favicon */}
        <img
          src={faviconUrl}
          alt=""
          aria-hidden="true"
          className="w-5 h-5 rounded shrink-0"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />

        {/* Name + domain */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate group-hover:text-primary transition-colors duration-150">
            {link.name || link.url}
          </p>
          <p className="text-xs text-text-secondary truncate mt-0.5">{link.domain}</p>
        </div>

        {/* Description */}
        {link.description && (
          <p className="hidden lg:block text-xs text-text-secondary truncate max-w-xs shrink">{link.description}</p>
        )}

        {/* Date */}
        {link.createdAtFormatted && (
          <span className="hidden sm:flex items-center gap-1 text-xs text-text-secondary shrink-0">
            <Calendar size={11} />
            {link.createdAtFormatted}
          </span>
        )}

        {/* Type badge */}
        {link.type && link.type !== 'url' && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary shrink-0">
            {link.type}
          </span>
        )}

        <ExternalLink size={14} className="text-text-secondary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </a>
    );
  }

  // Grid card
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-3 p-4 rounded-xl border border-border-color bg-glass hover:bg-glass-light hover:border-primary/40 transition-all duration-200 cursor-pointer overflow-hidden"
      aria-label={`Open ${link.name}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={faviconUrl}
            alt=""
            aria-hidden="true"
            className="w-5 h-5 rounded shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="text-xs text-text-secondary truncate">{link.domain}</span>
        </div>
        {link.type && link.type !== 'url' && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary shrink-0">
            {link.type}
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors duration-150 line-clamp-2 leading-snug">
        {link.name || link.url}
      </p>

      {/* Description */}
      {link.description && (
        <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed flex-1">
          {link.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1">
        {link.createdAtFormatted ? (
          <span className="flex items-center gap-1 text-xs text-text-secondary">
            <Calendar size={10} />
            {link.createdAtFormatted}
          </span>
        ) : <span />}
        <ExternalLink size={13} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </a>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

const Skeleton: React.FC<{ viewMode: 'grid' | 'list'; count?: number }> = ({ viewMode, count = 12 }) => (
  <>
    {Array.from({ length: count }).map((_, i) =>
      viewMode === 'list' ? (
        <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border-color bg-glass animate-pulse">
          <div className="w-5 h-5 rounded bg-glass-light shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-glass-light rounded w-3/4" />
            <div className="h-2.5 bg-glass-light rounded w-1/2" />
          </div>
          <div className="h-2.5 bg-glass-light rounded w-20 hidden sm:block" />
        </div>
      ) : (
        <div key={i} className="flex flex-col gap-3 p-4 rounded-xl border border-border-color bg-glass animate-pulse">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-glass-light" />
            <div className="h-2.5 bg-glass-light rounded w-24 flex-1" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3.5 bg-glass-light rounded" />
            <div className="h-3.5 bg-glass-light rounded w-4/5" />
          </div>
          <div className="h-2.5 bg-glass-light rounded w-2/3 mt-auto" />
        </div>
      )
    )}
  </>
);

// ── Main page ─────────────────────────────────────────────────────────────────

const LinksPage: React.FC = () => {
  const {
    links, collections, pagination,
    isLoading, isLoadingMore, error,
    query, setQuery,
    collectionId, setCollectionId,
    refresh, loadMore,
  } = useLinkwarden();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCollections, setShowCollections] = useState(true);

  const handleClearSearch = useCallback(() => setQuery(''), [setQuery]);
  const handleClearCollection = useCallback(() => setCollectionId(null), [setCollectionId]);

  const hasFilters = query.trim() !== '' || collectionId !== null;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-border-color bg-glass/40 overflow-y-auto">
        <div className="p-4 space-y-1">
          {/* All links */}
          <button
            onClick={handleClearCollection}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
              collectionId === null
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'text-text-secondary hover:text-text-primary hover:bg-glass-light border border-transparent'
            }`}
          >
            <Link2 size={15} />
            All Links
            {pagination && collectionId === null && (
              <span className="ml-auto text-xs opacity-60">{links.length}{pagination.hasMore ? '+' : ''}</span>
            )}
          </button>

          {/* Collections section */}
          {collections.length > 0 && (
            <div className="pt-3">
              <button
                onClick={() => setShowCollections(v => !v)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                aria-expanded={showCollections}
              >
                <span>Collections</span>
                {showCollections ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {showCollections && (
                <div className="mt-1 space-y-0.5">
                  {collections.map(col => (
                    <button
                      key={col.id}
                      onClick={() => setCollectionId(collectionId === col.id ? null : col.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-150 cursor-pointer ${
                        collectionId === col.id
                          ? 'bg-primary/10 text-primary border border-primary/30 font-medium'
                          : 'text-text-secondary hover:text-text-primary hover:bg-glass-light border border-transparent'
                      }`}
                    >
                      <Folder size={13} className="shrink-0" />
                      <span className="truncate">{col.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Open Linkwarden button */}
        <div className="mt-auto p-4">
          <a
            href="https://links.samixism.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl border border-border-color bg-glass hover:bg-glass-light text-sm text-text-secondary hover:text-text-primary transition-all duration-150 cursor-pointer"
          >
            <Globe size={14} />
            Open Linkwarden
            <ExternalLink size={12} />
          </a>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* Header */}
        <header className="flex items-center gap-3 px-6 py-4 border-b border-border-color shrink-0">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-text-primary">Links</h1>
            {!isLoading && (
              <p className="text-xs text-text-secondary mt-0.5">
                {links.length}{pagination?.hasMore ? '+' : ''} link{links.length !== 1 ? 's' : ''}
                {collectionId !== null && collections.find(c => c.id === collectionId) && (
                  <span> in <span className="text-primary">{collections.find(c => c.id === collectionId)!.name}</span></span>
                )}
              </p>
            )}
          </div>

          {/* Search */}
          <div className="relative w-full max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search links…"
              aria-label="Search links"
              className="w-full pl-9 pr-8 py-2 bg-glass border border-border-color rounded-xl text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary/50 transition-colors duration-150"
            />
            {query && (
              <button
                onClick={handleClearSearch}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-glass border border-border-color rounded-xl overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              className={`p-2.5 transition-colors duration-150 cursor-pointer ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
              className={`p-2.5 transition-colors duration-150 cursor-pointer ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <List size={15} />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={refresh}
            disabled={isLoading}
            aria-label="Refresh links"
            title="Refresh"
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-glass border border-border-color text-text-secondary hover:text-text-primary hover:bg-glass-light transition-all duration-150 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </header>

        {/* Active filter chips */}
        {hasFilters && (
          <div className="flex items-center gap-2 px-6 py-2 border-b border-border-color shrink-0 flex-wrap">
            {query.trim() && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-medium">
                Search: "{query}"
                <button onClick={handleClearSearch} aria-label="Remove search filter" className="hover:text-primary/60 transition-colors cursor-pointer">
                  <X size={11} />
                </button>
              </span>
            )}
            {collectionId !== null && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-medium">
                <Folder size={11} />
                {collections.find(c => c.id === collectionId)?.name ?? `Collection ${collectionId}`}
                <button onClick={handleClearCollection} aria-label="Remove collection filter" className="hover:text-primary/60 transition-colors cursor-pointer">
                  <X size={11} />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm shrink-0">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        {/* Link grid / list */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'flex flex-col gap-2'
            }>
              <Skeleton viewMode={viewMode} />
            </div>
          ) : links.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-text-secondary">
              <Link2 size={40} className="opacity-20" />
              <p className="text-sm font-medium">{hasFilters ? 'No links match your search' : 'No links saved yet'}</p>
              {hasFilters && (
                <button
                  onClick={() => { setQuery(''); setCollectionId(null); }}
                  className="text-sm text-primary hover:underline cursor-pointer"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className={viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'flex flex-col gap-2'
              }>
                {links.map(link => (
                  <LinkCard key={`${link.id}-${link.url}`} link={link} viewMode={viewMode} />
                ))}
                {/* Skeleton appended during load-more */}
                {isLoadingMore && <Skeleton viewMode={viewMode} count={4} />}
              </div>

              {/* Load more */}
              {pagination?.hasMore && !isLoadingMore && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={loadMore}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-border-color bg-glass hover:bg-glass-light text-sm text-text-secondary hover:text-text-primary transition-all duration-150 cursor-pointer"
                  >
                    Load more
                  </button>
                </div>
              )}

              {isLoadingMore && !pagination?.hasMore && (
                <div className="flex justify-center mt-6">
                  <Loader2 size={20} className="animate-spin text-text-secondary" />
                </div>
              )}

              {/* End of results */}
              {!pagination?.hasMore && links.length > 0 && (
                <p className="text-center text-xs text-text-secondary mt-8 pb-4">
                  All {links.length} links loaded
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LinksPage;
