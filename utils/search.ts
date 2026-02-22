export interface SearchHit {
  id: string;
  [key: string]: unknown;
  _formatted?: Record<string, string>;
}

export interface SearchIndexResult {
  hits: SearchHit[];
  estimatedTotalHits: number;
}

export interface SearchResults {
  query: string;
  results: Record<string, SearchIndexResult>;
  processingTimeMs: number;
}

export async function globalSearch(
  query: string,
  types?: string[],
  page = 0,
  limit = 5,
): Promise<SearchResults> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    limit: String(limit),
  });
  if (types?.length) params.set('types', types.join(','));

  const res = await fetch(`/api/search?${params}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}
