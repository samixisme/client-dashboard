import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { DataProvider, useData } from '../contexts/DataContext';
import { onAuthStateChanged } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';

const mockOnAuthStateChanged = onAuthStateChanged as jest.Mock;
const mockOnSnapshot = onSnapshot as jest.Mock;

// Test consumer that reads context values
const TestConsumer = () => {
  const { data, loading, user } = useData();
  if (loading) return <div>Loading...</div>;
  return (
    <div>
      <span data-testid="user-uid">{user?.uid ?? 'none'}</span>
      <span data-testid="projects-count">{data.projects.length}</span>
      <span data-testid="brands-count">{data.brands.length}</span>
    </div>
  );
};

// Test consumer that uses updateData
const UpdateConsumer = () => {
  const { data, updateData } = useData();
  return (
    <div>
      <span data-testid="tasks-count">{data.tasks.length}</span>
      <button
        data-testid="update-btn"
        onClick={() => updateData('tasks', [{ id: 't1', title: 'Test Task' }] as unknown[])}
      >
        Update
      </button>
    </div>
  );
};

describe('DataContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides a safe fallback when used outside provider', () => {
    render(<TestConsumer />);
    // useData returns a fallback object instead of throwing
    expect(screen.getByTestId('user-uid').textContent).toBe('none');
    expect(screen.getByTestId('projects-count').textContent).toBe('0');
  });

  it('shows loading initially then resolves when no user', async () => {
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (u: null) => void) => {
      // Simulate async — call back with null (no user)
      callback(null);
      return jest.fn();
    });

    // onSnapshot should not be called when there's no user
    mockOnSnapshot.mockImplementation(() => jest.fn());

    await act(async () => {
      render(
        <DataProvider>
          <TestConsumer />
        </DataProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('user-uid').textContent).toBe('none');
    });
  });

  it('sets user when authenticated and starts Firestore listeners', async () => {
    const mockUser = { uid: 'user-1', email: 'test@example.com', getIdToken: jest.fn(() => Promise.resolve('token')) };

    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (u: unknown) => void) => {
      callback(mockUser);
      return jest.fn();
    });

    // Mock onSnapshot to call success callback with mock docs
    // Must handle both collection snapshots (docs array) and document snapshots (exists/data)
    mockOnSnapshot.mockImplementation((_query: unknown, callback: (snap: unknown) => void) => {
      callback({
        // Collection snapshot fields
        docs: [
          { id: 'doc-1', ref: { path: 'projects/doc-1' }, data: () => ({ name: 'Test' }) },
          { id: 'doc-2', ref: { path: 'projects/doc-2' }, data: () => ({ name: 'Test 2' }) },
        ],
        forEach: jest.fn(),
        empty: false,
        size: 2,
        // Document snapshot fields (for single-doc listeners like userSettings)
        exists: () => true,
        id: 'doc-1',
        data: () => ({}),
      });
      return jest.fn(); // unsubscribe
    });

    await act(async () => {
      render(
        <DataProvider>
          <TestConsumer />
        </DataProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('user-uid').textContent).toBe('user-1');
    });

    // onSnapshot should have been called multiple times (once per collection listener)
    expect(mockOnSnapshot).toHaveBeenCalled();
  });

  it('updateData modifies the data store and triggers re-render', async () => {
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (u: null) => void) => {
      callback(null);
      return jest.fn();
    });
    mockOnSnapshot.mockImplementation(() => jest.fn());

    let initialCount: number;

    await act(async () => {
      render(
        <DataProvider>
          <UpdateConsumer />
        </DataProvider>
      );
    });

    await waitFor(() => {
      // dataStore is a module-level singleton — prior tests may have populated it
      initialCount = Number(screen.getByTestId('tasks-count').textContent);
    });

    await act(async () => {
      screen.getByTestId('update-btn').click();
    });

    await waitFor(() => {
      // After updateData replaces tasks array, count should be exactly 1
      expect(screen.getByTestId('tasks-count').textContent).toBe('1');
    });
  });

  it('cleans up auth subscription on unmount', () => {
    const mockUnsubscribe = jest.fn();
    mockOnAuthStateChanged.mockImplementation(() => mockUnsubscribe);
    mockOnSnapshot.mockImplementation(() => jest.fn());

    const { unmount } = render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
