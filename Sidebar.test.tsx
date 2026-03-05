import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar, { SearchBar } from './components/layout/Sidebar';
import { SearchProvider } from './contexts/SearchContext';

jest.mock('./contexts/ActiveProjectContext', () => ({
  useActiveProject: () => ({ activeProjectId: '123' })
}));

describe('SearchBar', () => {
  it('renders HighlightText correctly', () => {
    // We mock search context to force it to show dropdown with <mark> tags
    jest.mock('./contexts/SearchContext', () => ({
      useSearch: () => ({
        searchQuery: 'test',
        setSearchQuery: jest.fn(),
        searchResults: {
          results: {
            projects: {
              estimatedTotalHits: 1,
              hits: [
                {
                  id: '1',
                  _formatted: {
                    name: 'This is a <mark>test</mark> project'
                  }
                }
              ]
            }
          }
        },
        isSearching: false,
        clearSearch: jest.fn()
      }),
      SearchProvider: ({ children }: any) => <>{children}</>
    }));

    // Using dynamic import so mock applies
    const { SearchBar } = require('./components/layout/Sidebar');

    render(
      <BrowserRouter>
        <SearchBar />
      </BrowserRouter>
    );

    const markEl = screen.getByText('test');
    expect(markEl.tagName.toLowerCase()).toBe('mark');
    expect(screen.getByText(/This is a/)).toBeInTheDocument();
    expect(screen.getByText(/project/)).toBeInTheDocument();
  });
});
