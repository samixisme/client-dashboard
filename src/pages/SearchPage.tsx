/**
 * SearchPage Component
 *
 * Full-page search experience with:
 * - URL-driven state (/search?q=text&status=active)
 * - Facet sidebar on left
 * - Results in center/right
 * - Sort, filter breadcrumbs, and result count
 * - Mobile-responsive layout
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSearch, type SearchHit, type SearchSort, type SearchFilters } from '../hooks/useSearch';
import { SearchResults } from '../components/search/SearchResults';
import { FacetSidebar } from '../components/search/FacetFilter';
import { Search, X } from 'lucide-react';
import '../components/search/search.css';

// ── Constants ──────────────────────────────────────────────────────────

const ALL_FACETS = ['status', 'priority', 'type', 'industry', 'projectId'];

// ── Route helper ───────────────────────────────────────────────────────

function getResultRoute(hit: SearchHit, indexUid: string): string {
  switch (indexUid) {
    case 'projects':
      return `/projects/${hit.id}`;
    case 'tasks':
      return `/projects/${hit.projectId}/board/${hit.boardId}?task=${hit.id}`;
    case 'brands':
      return `/brands/${hit.id}`;
    case 'feedback_items':
      return `/projects/${hit.projectId}/feedback/${hit.id}`;
    case 'invoices':
      return `/invoices/${hit.id}`;
    case 'clients':
      return `/clients/${hit.id}`;
    case 'drive_files':
      return `/files?file=${hit.id}`;
    default:
      return '/';
  }
}

// ── Component ──────────────────────────────────────────────────────────

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Read URL state
  const urlQuery = searchParams.get('q') || '';
  const urlSort = searchParams.get('sortBy');
  const urlSortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;

  // Parse filter params from URL
  const urlFilters = useMemo<SearchFilters>(() => {
    const filters: SearchFilters = {};
    for (const key of ALL_FACETS) {
      const val = searchParams.get(key);
      if (val) {
        filters[key] = val.split(',');
      }
    }
    return filters;
  }, [searchParams]);

  const urlSortObj = useMemo<SearchSort | undefined>(
    () =>
      urlSort && urlSortOrder
        ? { sortBy: urlSort, sortOrder: urlSortOrder }
        : undefined,
    [urlSort, urlSortOrder]
  );

  const {
    results,
    query,
    isLoading,
    error,
    totalHits,
    processingTimeMs,
    facets,
    setQuery,
    updateFilters,
    updateSort,
  } = useSearch(urlQuery, {
    filters: urlFilters,
    sort: urlSortObj,
    limit: 10,
    facets: ALL_FACETS,
  });

  // Sync URL → hook on mount
  useEffect(() => {
    if (urlQuery) setQuery(urlQuery);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Build selectedFilters from URL for sidebar
  const selectedFilters = useMemo(() => {
    const selected: Record<string, string[]> = {};
    for (const key of ALL_FACETS) {
      const val = searchParams.get(key);
      if (val) {
        selected[key] = val.split(',');
      }
    }
    return selected;
  }, [searchParams]);

  // Update URL when query changes
  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newQuery = e.target.value;
      setQuery(newQuery);

      const newParams = new URLSearchParams(searchParams);
      if (newQuery) {
        newParams.set('q', newQuery);
      } else {
        newParams.delete('q');
      }
      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams, setQuery]
  );

  // Handle filter changes
  const handleFilterChange = useCallback(
    (facetKey: string, values: string[]) => {
      const newParams = new URLSearchParams(searchParams);
      if (values.length > 0) {
        newParams.set(facetKey, values.join(','));
      } else {
        newParams.delete(facetKey);
      }
      setSearchParams(newParams, { replace: true });

      // Build updated filters
      const newFilters: SearchFilters = {};
      for (const key of ALL_FACETS) {
        const val = newParams.get(key);
        if (val) {
          newFilters[key] = val.split(',');
        }
      }
      updateFilters(newFilters);
    },
    [searchParams, setSearchParams, updateFilters]
  );

  // Handle sort
  const handleSortChange = useCallback(
    (sort: SearchSort | undefined) => {
      const newParams = new URLSearchParams(searchParams);
      if (sort) {
        newParams.set('sortBy', sort.sortBy);
        newParams.set('sortOrder', sort.sortOrder);
      } else {
        newParams.delete('sortBy');
        newParams.delete('sortOrder');
      }
      setSearchParams(newParams, { replace: true });
      updateSort(sort);
    },
    [searchParams, setSearchParams, updateSort]
  );

  // Handle clear all
  const handleClearAll = useCallback(() => {
    const newParams = new URLSearchParams();
    if (query) newParams.set('q', query);
    setSearchParams(newParams, { replace: true });
    updateFilters({});
  }, [query, setSearchParams, updateFilters]);

  // Handle result click
  const handleResultClick = useCallback(
    (hit: SearchHit, indexUid: string) => {
      navigate(getResultRoute(hit, indexUid));
    },
    [navigate]
  );

  // Active filter tags for breadcrumbs
  const activeFilterTags = useMemo(() => {
    const tags: Array<{ key: string; value: string }> = [];
    for (const [key, values] of Object.entries(selectedFilters)) {
      for (const value of values) {
        tags.push({ key, value });
      }
    }
    return tags;
  }, [selectedFilters]);

  return (
    <div className="search-page">
      {/* Facet Sidebar */}
      <FacetSidebar
        facets={facets}
        selectedFilters={selectedFilters}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearAll}
      />

      {/* Main Content */}
      <div className="search-page__main">
        <div className="search-page__header">
          <div className="search-page__input-row">
            <Search size={18} style={{ color: 'var(--text-secondary)' }} />
            <input
              className="search-page__input"
              type="text"
              placeholder="Search everything…"
              value={query}
              onChange={handleQueryChange}
              autoFocus
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('q');
                  setSearchParams(newParams, { replace: true });
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                type="button"
                aria-label="Clear search"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Filter breadcrumbs */}
          {activeFilterTags.length > 0 && (
            <div className="search-page__breadcrumbs">
              {activeFilterTags.map((tag) => (
                <button
                  key={`${tag.key}-${tag.value}`}
                  className="search-page__filter-tag"
                  onClick={() => {
                    const currentValues = selectedFilters[tag.key] || [];
                    handleFilterChange(
                      tag.key,
                      currentValues.filter((v) => v !== tag.value)
                    );
                  }}
                  type="button"
                  aria-label={`Remove filter ${tag.key}: ${tag.value}`}
                >
                  {tag.key}: {tag.value}
                  <X size={12} aria-hidden="true" />
                </button>
              ))}
              <button
                className="search-page__filter-tag"
                onClick={handleClearAll}
                type="button"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        <SearchResults
          results={results}
          isLoading={isLoading}
          error={error}
          query={query}
          totalHits={totalHits}
          processingTimeMs={processingTimeMs}
          onResultClick={handleResultClick}
          onSortChange={handleSortChange}
          currentSort={urlSortObj}
        />
      </div>
    </div>
  );
};

export default SearchPage;
