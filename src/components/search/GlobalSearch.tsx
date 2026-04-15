/**
 * GlobalSearch Component
 *
 * Cmd+K / Ctrl+K triggered search modal with:
 * - Instant results grouped by type
 * - Keyboard navigation (arrows, Enter, Esc)
 * - Recent searches via localStorage
 * - Click outside to close
 * - Mobile-responsive overlay
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearch } from '../../hooks/useSearch';
import { SearchResults } from './SearchResults';
import type { SearchHit } from '../../hooks/useSearch';
import { Search, X, Clock, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ── Recent Searches ────────────────────────────────────────────────────

const RECENT_SEARCHES_KEY = 'search_recent';
const MAX_RECENT = 10;

function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(query: string) {
  if (!query.trim()) return;
  const recent = getRecentSearches().filter((s) => s !== query);
  recent.unshift(query);
  localStorage.setItem(
    RECENT_SEARCHES_KEY,
    JSON.stringify(recent.slice(0, MAX_RECENT))
  );
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}

// ── Navigation helpers ─────────────────────────────────────────────────

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

export interface GlobalSearchProps {
  onSearch?: (query: string) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onSearch }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [activeTab, setActiveTab] = useState<string | 'all'>('all');

  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { results, query, isLoading, error, totalHits, processingTimeMs, setQuery, clearAll } =
    useSearch('', {
      limit: 5,
      facets: ['status', 'priority', 'type'],
    });

  // Flat results for keyboard navigation
  const flatResults = React.useMemo(() => {
    if (!results) return [];
    const indexesWithResults = Object.entries(results).filter(
      ([, r]) => r.hits && r.hits.length > 0
    );
    const displayedResults =
      activeTab === 'all'
        ? indexesWithResults
        : indexesWithResults.filter(([uid]) => uid === activeTab);

    const flat: Array<{ hit: SearchHit; indexUid: string }> = [];
    displayedResults.forEach(([uid, r]) => {
      r.hits.forEach((hit) => {
        flat.push({ hit, indexUid: uid });
      });
    });
    return flat;
  }, [results, activeTab]);

  // Open/close handlers
  const openSearch = useCallback(() => {
    setIsOpen(true);
    setRecentSearches(getRecentSearches());
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    clearAll();
    setSelectedIndex(-1);
    setActiveTab('all');
  }, [clearAll]);

  // Handle result navigation
  const handleResultClick = useCallback(
    (hit: SearchHit, indexUid: string) => {
      addRecentSearch(query);
      onSearch?.(query);
      closeSearch();
      navigate(getResultRoute(hit, indexUid));
    },
    [query, onSearch, closeSearch, navigate]
  );

  // Global keyboard shortcut: Cmd+K / Ctrl+K and modal navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          closeSearch();
        } else {
          openSearch();
        }
      }

      if (e.key === 'Escape' && isOpen) {
        closeSearch();
      }

      if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < flatResults.length - 1 ? prev + 1 : prev
          );
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < flatResults.length) {
            const { hit, indexUid } = flatResults[selectedIndex];
            handleResultClick(hit, indexUid);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, openSearch, closeSearch, flatResults, selectedIndex, handleResultClick]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (overlayRef.current && e.target === overlayRef.current) {
        closeSearch();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, closeSearch]);

  // Handle query change
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedIndex(-1);
    setActiveTab('all');
  };

  // Handle recent search click
  const handleRecentClick = (term: string) => {
    setQuery(term);
  };

  if (!isOpen) {
    return (
      <button
        className="global-search__trigger"
        onClick={openSearch}
        type="button"
        aria-label="Search (⌘K)"
      >
        <Search size={16} />
        <span className="global-search__trigger-text">Search…</span>
        <kbd className="global-search__kbd">⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="global-search__overlay" ref={overlayRef}>
      <div className="global-search__modal" role="dialog" aria-label="Search">
        {/* Input */}
        <div className="global-search__input-row">
          <Search size={18} className="global-search__input-icon" />
          <input
            ref={inputRef}
            className="global-search__input"
            type="text"
            placeholder="Search projects, tasks, clients, files…"
            value={query}
            onChange={handleQueryChange}
            aria-label="Search"
            autoComplete="off"
          />
          {query && (
            <button
              className="global-search__clear"
              onClick={() => setQuery('')}
              type="button"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
          <button
            className="global-search__close"
            onClick={closeSearch}
            type="button"
            aria-label="Close search"
          >
            <kbd>Esc</kbd>
          </button>
        </div>

        {/* Body */}
        <div className="global-search__body">
          {!query && recentSearches.length > 0 && (
            <div className="global-search__recent">
              <div className="global-search__recent-header">
                <span>Recent searches</span>
                <button
                  className="global-search__recent-clear"
                  onClick={() => {
                    clearRecentSearches();
                    setRecentSearches([]);
                  }}
                  type="button"
                >
                  Clear
                </button>
              </div>
              {recentSearches.map((term) => (
                <button
                  key={term}
                  className="global-search__recent-item"
                  onClick={() => handleRecentClick(term)}
                  type="button"
                >
                  <Clock size={14} />
                  <span>{term}</span>
                </button>
              ))}
            </div>
          )}

          {query && (
            <SearchResults
              results={results}
              isLoading={isLoading}
              error={error}
              query={query}
              totalHits={totalHits}
              processingTimeMs={processingTimeMs}
              onResultClick={handleResultClick}
              selectedIndex={selectedIndex}
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
                setSelectedIndex(-1);
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="global-search__footer">
          <span className="global-search__hint">
            <ArrowUp size={12} />
            <ArrowDown size={12} />
            to navigate
          </span>
          <span className="global-search__hint">
            <CornerDownLeft size={12} />
            to select
          </span>
          <span className="global-search__hint">
            <kbd>Esc</kbd>
            to close
          </span>
        </div>
      </div>
    </div>
  );
};
