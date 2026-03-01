import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { UserProvider, useUser } from '../contexts/UserContext';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';

// Cast mocks for type safety
const mockOnAuthStateChanged = onAuthStateChanged as jest.Mock;
const mockGetDoc = getDoc as jest.Mock;

// Test consumer component
const TestConsumer = () => {
  const { user, loading } = useUser();
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>No user</div>;
  return (
    <div>
      <span data-testid="uid">{user.uid}</span>
      <span data-testid="email">{user.email}</span>
      <span data-testid="role">{user.role}</span>
      <span data-testid="status">{user.status}</span>
      <span data-testid="name">{user.name}</span>
    </div>
  );
};

describe('UserContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state initially', () => {
    // Don't call the auth callback immediately — keep it pending
    mockOnAuthStateChanged.mockImplementation(() => jest.fn());

    render(
      <UserProvider>
        <TestConsumer />
      </UserProvider>
    );

    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('sets user data when authenticated', async () => {
    const mockUser = { uid: 'user-1', email: 'test@example.com', getIdToken: jest.fn(() => Promise.resolve('token')) };

    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (u: unknown) => void) => {
      callback(mockUser);
      return jest.fn();
    });

    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'user-1',
      data: () => ({
        firstName: 'Test',
        lastName: 'User',
        role: 'client',
        status: 'approved',
        email: 'test@example.com',
      }),
    });

    await act(async () => {
      render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('uid').textContent).toBe('user-1');
      expect(screen.getByTestId('role').textContent).toBe('client');
      expect(screen.getByTestId('status').textContent).toBe('approved');
      expect(screen.getByTestId('name').textContent).toBe('Test User');
    });
  });

  it('sets null user when unauthenticated', async () => {
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (u: null) => void) => {
      callback(null);
      return jest.fn();
    });

    await act(async () => {
      render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('No user')).toBeTruthy();
    });
  });

  it('throws when useUser is called outside provider', () => {
    // Suppress console.error for expected error
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useUser must be used within a UserProvider');

    spy.mockRestore();
  });

  it('cleans up auth subscription on unmount', () => {
    const mockUnsubscribe = jest.fn();
    mockOnAuthStateChanged.mockImplementation(() => mockUnsubscribe);

    const { unmount } = render(
      <UserProvider>
        <TestConsumer />
      </UserProvider>
    );

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
