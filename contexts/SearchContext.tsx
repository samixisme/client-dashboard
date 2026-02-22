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

  // Build a stable snapshot of all searchable data
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

      const results: SearchResults['results'] = {
        projects: {
          hits: corpus.projects
            .filter(p => matchesAny(p as unknown as Record<string, unknown>, q, ['name', 'description', 'status']))
            .slice(0, 5)
            .map(p => hit(p.id, { name: p.name, description: (p as Record<string, unknown>).description, status: (p as Record<string, unknown>).status })),
          estimatedTotalHits: corpus.projects.filter(p =>
            matchesAny(p as unknown as Record<string, unknown>, q, ['name', 'description', 'status'])).length,
        },
        tasks: {
          hits: corpus.tasks
            .filter(t => matchesAny(t as unknown as Record<string, unknown>, q, ['title', 'description', 'priority', 'status']))
            .slice(0, 5)
            .map(t => hit(t.id, { title: t.title, status: t.status, priority: t.priority })),
          estimatedTotalHits: corpus.tasks.filter(t =>
            matchesAny(t as unknown as Record<string, unknown>, q, ['title', 'description', 'priority', 'status'])).length,
        },
        brands: {
          hits: corpus.brands
            .filter(b => matchesAny(b as unknown as Record<string, unknown>, q, ['name', 'industry', 'brandVoice']))
            .slice(0, 5)
            .map(b => hit(b.id, { name: b.name, industry: (b as Record<string, unknown>).industry })),
          estimatedTotalHits: corpus.brands.filter(b =>
            matchesAny(b as unknown as Record<string, unknown>, q, ['name', 'industry', 'brandVoice'])).length,
        },
        clients: {
          hits: corpus.clients
            .filter(c => matchesAny(c as unknown as Record<string, unknown>, q, ['name', 'adresse', 'ice']))
            .slice(0, 5)
            .map(c => hit(c.id, { name: c.name })),
          estimatedTotalHits: corpus.clients.filter(c =>
            matchesAny(c as unknown as Record<string, unknown>, q, ['name', 'adresse', 'ice'])).length,
        },
        invoices: {
          hits: corpus.invoices
            .filter(i => matchesAny(i as unknown as Record<string, unknown>, q, ['invoiceNumber', 'status']))
            .slice(0, 5)
            .map(i => hit(i.id, { invoiceNumber: (i as Record<string, unknown>).invoiceNumber, status: (i as Record<string, unknown>).status })),
          estimatedTotalHits: corpus.invoices.filter(i =>
            matchesAny(i as unknown as Record<string, unknown>, q, ['invoiceNumber', 'status'])).length,
        },
        docs: {
          hits: corpus.docs
            .filter(d => matchesAny(d as unknown as Record<string, unknown>, q, ['title', 'mode']))
            .slice(0, 5)
            .map(d => hit(d.id, { title: d.title, mode: d.mode })),
          estimatedTotalHits: corpus.docs.filter(d =>
            matchesAny(d as unknown as Record<string, unknown>, q, ['title', 'mode'])).length,
        },
      };

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
