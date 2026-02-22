import React, { createContext, useState, useContext, useEffect, useRef, useCallback, useMemo, ReactNode } from 'react';
import { useData } from './DataContext';
import { useDocs } from './DocsContext';
import { SearchResults, SearchHit } from '../utils/search';

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResults | null;
  isSearching: boolean;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

function match(value: unknown, q: string): boolean {
  if (typeof value === 'string') return value.toLowerCase().includes(q);
  if (typeof value === 'number') return String(value).includes(q);
  return false;
}

function matchesAny(obj: Record<string, unknown>, q: string, fields: string[]): boolean {
  return fields.some(f => match(obj[f], q));
}

export const SearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data } = useData();
  const { docs } = useDocs();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults(null);
    setIsSearching(false);
  }, []);

  const corpus = useMemo(() => ({
    projects: data.projects,
    tasks: data.tasks,
    brands: data.brands,
    clients: data.clients,
    invoices: data.invoices,
    docs,
  }), [data.projects, data.tasks, data.brands, data.clients, data.invoices, docs]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (searchQuery.length < 2) {
      setSearchResults(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      setIsSearching(true);
      const q = searchQuery.toLowerCase();
      const start = Date.now();

      const hit = (id: string, obj: Record<string, unknown>): SearchHit => ({ id, ...obj });

      const results: SearchResults['results'] = (() => {
        const r = <T extends { id: string }>(
          arr: T[],
          fields: string[],
          mapper: (item: T) => Record<string, unknown>
        ) => {
          const matches = arr.filter(item => matchesAny(item as unknown as Record<string, unknown>, q, fields));
          return { hits: matches.slice(0, 5).map(item => hit(item.id, mapper(item))), estimatedTotalHits: matches.length };
        };

        return {
          projects: r(corpus.projects, ['name', 'description', 'status'], p => ({ name: p.name, description: (p as unknown as Record<string, unknown>).description, status: (p as unknown as Record<string, unknown>).status })),
          tasks:    r(corpus.tasks,    ['title', 'description', 'priority', 'status'], t => ({ title: t.title, status: t.status, priority: t.priority })),
          brands:   r(corpus.brands,   ['name', 'industry', 'brandVoice'], b => ({ name: b.name, industry: (b as unknown as Record<string, unknown>).industry })),
          clients:  r(corpus.clients,  ['name', 'adresse', 'ice'], c => ({ name: c.name })),
          invoices: r(corpus.invoices, ['invoiceNumber', 'status'], i => ({ invoiceNumber: (i as unknown as Record<string, unknown>).invoiceNumber, status: (i as unknown as Record<string, unknown>).status })),
          docs:     r(corpus.docs,     ['title', 'mode'], d => ({ title: d.title, mode: d.mode })),
        };
      })();

      setSearchResults({ query: searchQuery, results, processingTimeMs: Date.now() - start });
      setIsSearching(false);
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, corpus]);

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery, searchResults, isSearching, clearSearch }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = (): SearchContextType => {
  const context = useContext(SearchContext);
  if (!context) throw new Error('useSearch must be used within a SearchProvider');
  return context;
};
