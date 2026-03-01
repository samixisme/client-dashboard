import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { SearchProvider, useSearch } from '../contexts/SearchContext';
import { useData } from '../contexts/DataContext';
import { useDocs } from '../contexts/DocsContext';

jest.mock('../contexts/DataContext', () => ({
  useData: jest.fn(),
}));

jest.mock('../contexts/DocsContext', () => ({
  useDocs: jest.fn(),
}));

const mockUseData = useData as jest.Mock;
const mockUseDocs = useDocs as jest.Mock;

const TestConsumer = () => {
  const { searchQuery, setSearchQuery, searchResults, clearSearch } = useSearch();
  return (
    <div>
      <span data-testid="searchQuery">{searchQuery}</span>
      <span data-testid="hasResults">{searchResults ? 'yes' : 'no'}</span>
      <span data-testid="projectsHits">{searchResults?.results?.projects?.hits?.length || 0}</span>
      <span data-testid="tasksHits">{searchResults?.results?.tasks?.hits?.length || 0}</span>
      <span data-testid="clientsHits">{searchResults?.results?.clients?.hits?.length || 0}</span>
      
      <button data-testid="setSearchQuery" onClick={() => setSearchQuery('test')}>Set Search Query</button>
      <button data-testid="setSearchQueryUpper" onClick={() => setSearchQuery('TEST')}>Set Uppercase Query</button>
      <button data-testid="clearSearch" onClick={clearSearch}>Clear Search</button>
    </div>
  );
};

describe('SearchContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseData.mockReturnValue({
      data: {
        projects: [
          { id: 'p1', name: 'Test Project' },
          { id: 'p2', name: 'Other Project' }
        ],
        tasks: [
          { id: 't1', title: 'Test Task' },
          { id: 't2', title: 'Another Task' }
        ],
        brands: [],
        clients: [
          { id: 'c1', name: 'Test Client' },
          { id: 'c2', name: 'Someone Else' }
        ],
        invoices: []
      }
    });

    mockUseDocs.mockReturnValue({
      docs: []
    });
    
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows initial searchQuery is empty string', () => {
    render(
      <SearchProvider>
        <TestConsumer />
      </SearchProvider>
    );
    expect(screen.getByTestId('searchQuery').textContent).toBe('');
    expect(screen.getByTestId('hasResults').textContent).toBe('no');
  });

  it('filters results across all data types when setSearchQuery("test") is called', async () => {
    render(
      <SearchProvider>
        <TestConsumer />
      </SearchProvider>
    );
    
    act(() => {
      screen.getByTestId('setSearchQuery').click();
    });
    
    act(() => {
      jest.runAllTimers();
    });
    
    expect(screen.getByTestId('searchQuery').textContent).toBe('test');
    
    await waitFor(() => {
      expect(screen.getByTestId('hasResults').textContent).toBe('yes');
      expect(screen.getByTestId('projectsHits').textContent).toBe('1');
      expect(screen.getByTestId('tasksHits').textContent).toBe('1');
      expect(screen.getByTestId('clientsHits').textContent).toBe('1');
    });
  });

  it('returns empty results when clearSearch() is called', async () => {
    render(
      <SearchProvider>
        <TestConsumer />
      </SearchProvider>
    );
    
    act(() => {
      screen.getByTestId('setSearchQuery').click();
    });
    
    act(() => {
      jest.runAllTimers();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('hasResults').textContent).toBe('yes');
    });
    
    act(() => {
      screen.getByTestId('clearSearch').click();
    });
    
    expect(screen.getByTestId('searchQuery').textContent).toBe('');
    expect(screen.getByTestId('hasResults').textContent).toBe('no');
  });

  it('is case-insensitive when searching', async () => {
    render(
      <SearchProvider>
        <TestConsumer />
      </SearchProvider>
    );
    
    act(() => {
      screen.getByTestId('setSearchQueryUpper').click();
    });
    
    act(() => {
      jest.runAllTimers();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('hasResults').textContent).toBe('yes');
      expect(screen.getByTestId('projectsHits').textContent).toBe('1');
      expect(screen.getByTestId('tasksHits').textContent).toBe('1');
      expect(screen.getByTestId('clientsHits').textContent).toBe('1');
    });
  });

  it('throws when useSearch is called outside provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useSearch must be used within a SearchProvider');

    spy.mockRestore();
  });
});
