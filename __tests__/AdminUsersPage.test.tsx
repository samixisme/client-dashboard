import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUsersPage from '../pages/admin/AdminUsersPage';
import { useData } from '../contexts/DataContext';

// Mock DataContext
jest.mock('../contexts/DataContext', () => ({
  useData: jest.fn(),
}));

// Mock icon components
jest.mock('../components/icons/AddIcon', () => ({
  AddIcon: (props: Record<string, unknown>) => <svg data-testid="add-icon" {...props} />,
}));
jest.mock('../components/icons/EditIcon', () => ({
  EditIcon: (props: Record<string, unknown>) => <svg data-testid="edit-icon" {...props} />,
}));

// Mock EditUserModal
jest.mock('../components/admin/EditUserModal', () => {
  return function MockEditUserModal({ isOpen, user }: { isOpen: boolean; user: { name: string } }) {
    if (!isOpen) return null;
    return <div data-testid="edit-modal">Editing: {user.name}</div>;
  };
});

const mockUseData = useData as jest.Mock;

const mockUsers = [
  { id: 'u1', name: 'Alice Smith', firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com', role: 'admin', avatarUrl: '/alice.png', status: 'approved' },
  { id: 'u2', name: 'Bob Jones', firstName: 'Bob', lastName: 'Jones', email: 'bob@test.com', role: 'client', avatarUrl: '/bob.png', status: 'pending' },
];

describe('AdminUsersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state', () => {
    mockUseData.mockReturnValue({ data: { users: [] }, loading: true, error: null });

    render(<AdminUsersPage />);
    expect(screen.getByText('Loading users...')).toBeTruthy();
  });

  it('shows error state', () => {
    mockUseData.mockReturnValue({ data: { users: [] }, loading: false, error: new Error('Network fail') });

    render(<AdminUsersPage />);
    expect(screen.getByText('Error: Network fail')).toBeTruthy();
  });

  it('renders user list with names and emails', () => {
    mockUseData.mockReturnValue({ data: { users: mockUsers }, loading: false, error: null });

    render(<AdminUsersPage />);

    expect(screen.getByText('Alice Smith')).toBeTruthy();
    expect(screen.getByText('alice@test.com')).toBeTruthy();
    expect(screen.getByText('Bob Jones')).toBeTruthy();
    expect(screen.getByText('bob@test.com')).toBeTruthy();
  });

  it('renders role column for each user', () => {
    mockUseData.mockReturnValue({ data: { users: mockUsers }, loading: false, error: null });

    render(<AdminUsersPage />);

    expect(screen.getByText('admin')).toBeTruthy();
    expect(screen.getByText('client')).toBeTruthy();
  });

  it('renders Invite User button', () => {
    mockUseData.mockReturnValue({ data: { users: mockUsers }, loading: false, error: null });

    render(<AdminUsersPage />);
    expect(screen.getByText('Invite User')).toBeTruthy();
  });

  it('opens edit modal when edit button is clicked', async () => {
    mockUseData.mockReturnValue({ data: { users: mockUsers }, loading: false, error: null });
    const user = userEvent.setup();

    render(<AdminUsersPage />);

    // Click the first edit button
    const editButtons = screen.getAllByTitle('Edit');
    expect(editButtons.length).toBe(2);

    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('edit-modal')).toBeTruthy();
      expect(screen.getByText('Editing: Alice Smith')).toBeTruthy();
    });
  });

  it('renders empty table when no users', () => {
    mockUseData.mockReturnValue({ data: { users: [] }, loading: false, error: null });

    render(<AdminUsersPage />);

    // Table headers should still render
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByText('Role')).toBeTruthy();
  });
});
