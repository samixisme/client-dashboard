jest.mock('../components/admin/AdminPanel', () => () => <div data-testid='admin-panel'>Admin Panel</div>);
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BrandsPage from '../pages/BrandsPage';
import { useData } from '../contexts/DataContext';
import { useUser } from '../contexts/UserContext';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../contexts/DataContext', () => ({
  useData: jest.fn(),
}));

jest.mock('../contexts/UserContext', () => ({
  useUser: jest.fn(),
}));

jest.mock('../contexts/SearchContext', () => ({
  useSearch: () => ({ searchQuery: '' }),
}));

jest.mock('../contexts/AdminContext', () => ({
  useAdmin: () => ({ isEditMode: true }),
}));

jest.mock('gsap', () => ({
  gsap: {
    fromTo: jest.fn(),
    to: jest.fn(),
  }
}));

const mockUseData = useData as jest.Mock;
const mockUseUser = useUser as jest.Mock;

const mockBrands = [
  { id: 'b1', name: 'Test Brand', description: 'A test brand', status: 'Active' },
];

const mockClients = [
  { id: 'c1', name: 'Test Client', company: 'Test Co' }
];

describe('BrandsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({ user: { uid: 'admin1', role: 'admin' }, loading: false });
  });

  it('shows empty state when no data', async () => {
    mockUseData.mockReturnValue({
      data: { brands: [], clients: mockClients, users: [], projects: [], tasks: [], invoices: [], moodboards: [], feedbackComments: [], estimates: [], calendar_events: [], socialAccounts: [], boards: [], roadmapItems: [] },
      loading: false,
    });

    render(<MemoryRouter><BrandsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/Manage your company's brands/i)).toBeTruthy());
  });

  it('renders brands list', async () => {
    mockUseData.mockReturnValue({
      data: { brands: mockBrands, clients: mockClients, users: [], projects: [], tasks: [], invoices: [], moodboards: [], feedbackComments: [], estimates: [], calendar_events: [], socialAccounts: [], boards: [], roadmapItems: [] },
      loading: false,
    });

    render(<MemoryRouter><BrandsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Test Brand')).toBeTruthy());
  });
});





