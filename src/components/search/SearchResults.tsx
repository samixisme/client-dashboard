/**
 * SearchResults Component
 *
 * Container for search results with:
 * - Tabs per index type showing hit count
 * - Sort dropdown (Relevance, Most Recent, etc.)
 * - Loading, empty, and error states
 * - "View all" links for truncated result sets
 */

import React, { useState } from 'react';
import type { SearchIndexResult, SearchHit, SearchSort } from '../../hooks/useSearch';
import { ResultCard } from './ResultCard';
import { ArrowUpDown } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────

export interface SearchResultsProps {
  results: Record<string, SearchIndexResult>;
  isLoading: boolean;
  error: string | null;
  query: string;
  totalHits: number;
  processingTimeMs: number;
  onResultClick: (hit: SearchHit, indexUid: string) => void;
  onSortChange?: (sort: SearchSort | undefined) => void;
  currentSort?: SearchSort;
  selectedIndex?: number;
}

const INDEX_LABELS: Record<string, string> = {
  projects: 'Projects',
  tasks: 'Tasks',
  brands: 'Brands',
  feedback_items: 'Feedback',
  invoices: 'Invoices',
  clients: 'Clients',
  drive_files: 'Files',
};

const SORT_OPTIONS: Array<{ label: string; value: SearchSort | undefined }> = [
  { label: 'Relevance', value: undefined },
  { label: 'Most Recent', value: { sortBy: 'createdAt', sortOrder: 'desc' } },
  { label: 'Oldest First', value: { sortBy: 'createdAt', sortOrder: 'asc' } },
  { label: 'Name A–Z', value: { sortBy: 'name', sortOrder: 'asc' } },
];

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  isLoading,
  error,
  query,
  totalHits,
  processingTimeMs,
  onResultClick,
  onSortChange,
  currentSort,
  selectedIndex,
}) => {
  const [activeTab, setActiveTab] = useState<string | 'all'>('all');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Filter to only indexes with results
  const indexesWithResults = Object.entries(results).filter(
    ([, r]) => r.hits && r.hits.length > 0
  );

  if (error) {
    return (
      <div className="search-results__state search-results__state--error">
        <p>{error}</p>
      </div>
    );
  }

  if (isLoading && indexesWithResults.length === 0) {
    return (
      <div className="search-results__state search-results__state--loading">
        <div className="search-results__spinner" />
        <p>Searching…</p>
      </div>
    );
  }

  if (!query) {
    return null;
  }

  if (indexesWithResults.length === 0 && !isLoading) {
    return (
      <div className="search-results__state search-results__state--empty">
        <p>No results found for &ldquo;{query}&rdquo;</p>
        <p className="search-results__hint">Try different keywords or remove filters</p>
      </div>
    );
  }

  const displayedResults =
    activeTab === 'all'
      ? indexesWithResults
      : indexesWithResults.filter(([uid]) => uid === activeTab);

  return (
    <div className="search-results">
      {/* Stats bar */}
      <div className="search-results__stats">
        <span>
          {totalHits} result{totalHits !== 1 ? 's' : ''} in {processingTimeMs}ms
        </span>

        {/* Sort dropdown */}
        {onSortChange && (
          <div className="search-results__sort">
            <button
              className="search-results__sort-btn"
              onClick={() => setShowSortMenu(!showSortMenu)}
              type="button"
            >
              <ArrowUpDown size={14} />
              {SORT_OPTIONS.find(
                (o) =>
                  o.value?.sortBy === currentSort?.sortBy &&
                  o.value?.sortOrder === currentSort?.sortOrder
              )?.label || 'Relevance'}
            </button>
            {showSortMenu && (
              <div className="search-results__sort-menu">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    className="search-results__sort-option"
                    onClick={() => {
                      onSortChange(opt.value);
                      setShowSortMenu(false);
                    }}
                    type="button"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="search-results__tabs" role="tablist">
        <button
          className={`search-results__tab ${activeTab === 'all' ? 'search-results__tab--active' : ''}`}
          onClick={() => setActiveTab('all')}
          role="tab"
          aria-selected={activeTab === 'all'}
          type="button"
        >
          All ({totalHits})
        </button>
        {indexesWithResults.map(([uid, r]) => (
          <button
            key={uid}
            className={`search-results__tab ${activeTab === uid ? 'search-results__tab--active' : ''}`}
            onClick={() => setActiveTab(uid)}
            role="tab"
            aria-selected={activeTab === uid}
            type="button"
          >
            {INDEX_LABELS[uid] || uid} ({r.estimatedTotalHits})
          </button>
        ))}
      </div>

      {/* Results list */}
      <div className="search-results__list" role="listbox">
        {displayedResults.map(([uid, r]) => (
          <div key={uid} className="search-results__group">
            {activeTab === 'all' && (
              <h3 className="search-results__group-title">
                {INDEX_LABELS[uid] || uid}
              </h3>
            )}
            {r.hits.map((hit, idx) => (
              <ResultCard
                key={`${uid}-${hit.id}`}
                hit={hit}
                indexUid={uid}
                onClick={() => onResultClick(hit, uid)}
                isSelected={selectedIndex === idx}
              />
            ))}
            {r.estimatedTotalHits > r.hits.length && activeTab === 'all' && (
              <button
                className="search-results__view-all"
                onClick={() => setActiveTab(uid)}
                type="button"
              >
                View all {r.estimatedTotalHits} {INDEX_LABELS[uid] || uid} →
              </button>
            )}
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="search-results__loading-overlay">
          <div className="search-results__spinner" />
        </div>
      )}
    </div>
  );
};
