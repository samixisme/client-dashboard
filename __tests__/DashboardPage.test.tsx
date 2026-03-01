jest.mock('@/components/ui/button', () => ({ Button: 'button' }), { virtual: true });
jest.mock('@/components/ui/popover', () => ({ Popover: 'div', PopoverTrigger: 'div', PopoverContent: 'div' }), { virtual: true });
jest.mock('../components/ui/popover', () => ({ Popover: 'div', PopoverTrigger: 'div', PopoverContent: 'div' }), { virtual: true });
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from '../pages/DashboardPage';
import { useData } from '../contexts/DataContext';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../contexts/DataContext', () => ({
  useData: jest.fn(),
}));

jest.mock('../contexts/AdminContext', () => ({
  useAdmin: () => ({ isEditMode: true }),
}));

jest.mock('../contexts/SearchContext', () => ({
  useSearch: () => ({ searchQuery: '' }),
}));

jest.mock('../components/admin/AdminPanel', () => () => <div data-testid="admin-panel" />);

// Mock GSAP to prevent animation issues in JSDOM
jest.mock('gsap', () => ({
  gsap: {
    fromTo: jest.fn(),
    to: jest.fn(),
  }
}));

const mockUseData = useData as jest.Mock;

const mockData = {
  projects: [{ id: 'p1', name: 'Project One', status: 'Active' }],
  tasks: [{ id: 't1', title: 'Task One', status: 'Pending', stageId: 's1' }],
  stages: [{ id: 's1', name: 'To Do', status: 'Open' }],
  clients: [{ id: 'c1', name: 'Client One' }],
  activities: [{ id: 'a1', description: 'Did something', timestamp: new Date().toISOString(), type: 'task_created', userId: 'u1', data: {} }],
  dashboardWidgets: [{ id: 1, title: 'Total Revenue', content: '' }],
  boards: [],
  users: [{ id: 'u1', name: 'User One', avatarUrl: '' }],
  brands: [],
  feedbackMockups: [],
  feedbackVideos: [],
  feedbackWebsites: [],
  time_logs: [],
  invoices: [],
  estimates: [],
  calendar_events: [],
};

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state when data is loading', () => {
    mockUseData.mockReturnValue({ data: mockData, loading: true });
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    expect(document.querySelector('.animate-fade-in-up')).toBeTruthy();
  });

  it('renders stats cards', async () => {
    mockUseData.mockReturnValue({ data: mockData, loading: false });
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Project One')).toBeTruthy());
  });

  it('shows recent activity', async () => {
    mockUseData.mockReturnValue({ data: mockData, loading: false });
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/Did something/i)).toBeTruthy());
  });

  it('displays project summaries', async () => {
    mockUseData.mockReturnValue({ data: mockData, loading: false });
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Project One')).toBeTruthy());
  });
});





