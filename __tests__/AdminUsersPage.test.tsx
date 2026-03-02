import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AdminUsersPage from '../pages/admin/AdminUsersPage';

// The component uses useAdminApi (not useData) and useNovuTrigger
jest.mock('../hooks/useAdminApi', () => ({
  useAdminApi: jest.fn(() => ({
    loading: false,
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    del: jest.fn(),
    bulkDelete: jest.fn(),
  })),
}));

jest.mock('../src/hooks/useNovuTrigger', () => ({
  useNovuTrigger: jest.fn(() => ({ trigger: jest.fn() })),
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Users: (props: any) => <svg data-testid="users-icon" {...props} />,
  Shield: (props: any) => <svg data-testid="shield-icon" {...props} />,
  UserCheck: (props: any) => <svg data-testid="usercheck-icon" {...props} />,
  Clock: (props: any) => <svg data-testid="clock-icon" {...props} />,
}));

// Mock admin UI components
jest.mock('../components/admin/AdminPageHeader', () => ({
  AdminPageHeader: ({ title, description, actions }: { title: string; description: string; actions?: React.ReactNode }) => (
    <div data-testid="admin-page-header">
      <h1>{title}</h1>
      <p>{description}</p>
      {actions && <div data-testid="header-actions">{actions}</div>}
    </div>
  ),
}));

jest.mock('../components/admin/AdminStatsCard', () => ({
  AdminStatsCard: ({ label, value }: { label: string; value: string }) => (
    <div data-testid={`stat-${label}`}>{label}: {value}</div>
  ),
}));

jest.mock('../components/admin/AdminDataTable', () => ({
  AdminDataTable: ({ data }: { data: any[] }) => (
    <table data-testid="admin-data-table">
      <tbody>
        {data.map((row: any) => (
          <tr key={row.id}>
            <td>{row.name || `${row.firstName || ''} ${row.lastName || ''}`.trim()}</td>
            <td>{row.email}</td>
            <td>{row.role}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

jest.mock('../components/admin/AdminEmptyState', () => ({
  AdminEmptyState: ({ title }: { title: string }) => (
    <div data-testid="admin-empty-state">{title}</div>
  ),
}));

jest.mock('../components/admin/AdminLoadingSkeleton', () => ({
  AdminLoadingSkeleton: ({ variant }: { variant: string }) => (
    <div data-testid={`loading-skeleton-${variant}`}>Loading...</div>
  ),
}));

jest.mock('../components/admin/users/UserActionsMenu', () => ({
  ActionsMenu: () => <button>Actions</button>,
  getRelativeTime: (val: string) => val || 'Never',
}));

import { useAdminApi } from '../hooks/useAdminApi';
const mockUseAdminApi = useAdminApi as jest.Mock;

const mockUsers = [
  { id: 'u1', name: 'Alice Smith', firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com', role: 'admin', avatarUrl: '/alice.png', status: 'approved' },
  { id: 'u2', name: 'Bob Jones', firstName: 'Bob', lastName: 'Jones', email: 'bob@test.com', role: 'client', avatarUrl: '/bob.png', status: 'pending' },
];

describe('AdminUsersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state when fetching', async () => {
    // Make get() never resolve to keep isFetching=true
    mockUseAdminApi.mockReturnValue({
      loading: false,
      get: jest.fn(() => new Promise(() => {})),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      del: jest.fn(),
      bulkDelete: jest.fn(),
    });

    render(<AdminUsersPage />);
    expect(screen.getByText('Loading users...')).toBeTruthy();
  });

  it('renders user list after loading', async () => {
    mockUseAdminApi.mockReturnValue({
      loading: false,
      get: jest.fn().mockResolvedValue(mockUsers),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      del: jest.fn(),
      bulkDelete: jest.fn(),
    });

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeTruthy();
      expect(screen.getByText('alice@test.com')).toBeTruthy();
      expect(screen.getByText('Bob Jones')).toBeTruthy();
      expect(screen.getByText('bob@test.com')).toBeTruthy();
    });
  });

  it('renders stats cards', async () => {
    mockUseAdminApi.mockReturnValue({
      loading: false,
      get: jest.fn().mockResolvedValue(mockUsers),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      del: jest.fn(),
      bulkDelete: jest.fn(),
    });

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByTestId('stat-Total Users')).toBeTruthy();
      expect(screen.getByTestId('stat-Admins')).toBeTruthy();
    });
  });

  it('renders empty state when no users', async () => {
    mockUseAdminApi.mockReturnValue({
      loading: false,
      get: jest.fn().mockResolvedValue([]),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      del: jest.fn(),
      bulkDelete: jest.fn(),
    });

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByTestId('admin-empty-state')).toBeTruthy();
      expect(screen.getByText('No users found')).toBeTruthy();
    });
  });

  it('renders Add User button', async () => {
    mockUseAdminApi.mockReturnValue({
      loading: false,
      get: jest.fn().mockResolvedValue(mockUsers),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      del: jest.fn(),
      bulkDelete: jest.fn(),
    });

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Add User')).toBeTruthy();
    });
  });
});
