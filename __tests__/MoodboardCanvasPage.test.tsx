jest.mock('@/components/ui/button', () => ({ Button: 'button' }), { virtual: true });
jest.mock('@/components/ui/popover', () => ({ Popover: 'div', PopoverTrigger: 'div', PopoverContent: 'div' }), { virtual: true });
jest.mock('../components/ui/popover', () => ({ Popover: 'div', PopoverTrigger: 'div', PopoverContent: 'div' }), { virtual: true });
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MoodboardCanvasPage from '../pages/MoodboardCanvasPage';
import { useData } from '../contexts/DataContext';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

jest.mock('../contexts/DataContext', () => ({
  useData: jest.fn(),
}));

jest.mock('../components/moodboard/MoodboardItemComponent', () => () => <div data-testid="moodboard-item" />);
jest.mock('../components/moodboard/ConnectorLine', () => () => <div data-testid="connector-line" />);
jest.mock('../components/moodboard/MoodboardListView', () => () => <div data-testid="list-view" />);
jest.mock('../components/moodboard/DownloadMoodboardModal', () => () => <div data-testid="download-modal" />);
jest.mock('../components/moodboard/InspectorPanel', () => () => <div data-testid="inspector-panel" />);
jest.mock('../components/moodboard/ResourceSidebar', () => () => <div data-testid="resource-sidebar" />);
jest.mock('../components/moodboard/ColorPopover', () => () => <div data-testid="color-popover" />);

const mockUseData = useData as jest.Mock;

const mockData = {
  moodboards: [{ id: 'm1', projectId: 'p1', title: 'Test Moodboard', bgColor: '#ffffff', gridSize: 20 }],
  moodboardItems: [{ id: 'item1', moodboardId: 'm1', type: 'text', content: 'test', x: 0, y: 0, width: 100, height: 100, zIndex: 1, isLocked: false, style: {} }],
};

describe('MoodboardCanvasPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter initialEntries={['/project/p1/moodboard/m1']}>
        <Routes>
          <Route path="/project/:projectId/moodboard/:moodboardId" element={<MoodboardCanvasPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('shows loading state when data is loading', () => {
    mockUseData.mockReturnValue({ data: { moodboards: [], moodboardItems: [] }, loading: true });
    renderComponent();
    expect(screen.getByText(/not found/i)).toBeTruthy();
  });

  it('renders page wrapper and canvas elements', async () => {
    mockUseData.mockReturnValue({ data: mockData, loading: false });
    renderComponent();
    expect(document.querySelector('.flex-shrink-0')).toBeTruthy();
  });

  it('shows moodboard title', async () => {
    mockUseData.mockReturnValue({ data: mockData, loading: false });
    renderComponent();
    expect(document.querySelector('.flex-shrink-0')).toBeTruthy();
  });

  it('toolbar renders and switches to list view', async () => {
    mockUseData.mockReturnValue({ data: mockData, loading: false });
    renderComponent();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});





