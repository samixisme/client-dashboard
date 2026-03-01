import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { NotificationHistoryProvider, useNotificationHistory } from '../contexts/NotificationHistoryContext';

const TestConsumer = () => {
  const { notifications, addNotification, clearHistory } = useNotificationHistory();
  return (
    <div>
      <span data-testid="count">{notifications.length}</span>
      <span data-testid="firstMessage">{notifications.length > 0 ? notifications[0].message : ''}</span>
      <span data-testid="firstTimestamp">{notifications.length > 0 && notifications[0].timestamp ? 'has-timestamp' : 'no-timestamp'}</span>
      <button data-testid="addNotification" onClick={() => addNotification({ type: 'info', message: 'Test message' })}>Add</button>
      <button data-testid="clearHistory" onClick={clearHistory}>Clear</button>
    </div>
  );
};

describe('NotificationHistoryContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('loads initial notifications from localStorage', () => {
    const mockNotifications = [{ id: '1', type: 'info', message: 'Stored message', timestamp: new Date().toISOString(), read: false }];
    localStorage.setItem('sonner-notification-history', JSON.stringify(mockNotifications));
    
    render(
      <NotificationHistoryProvider>
        <TestConsumer />
      </NotificationHistoryProvider>
    );
    
    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(screen.getByTestId('firstMessage').textContent).toBe('Stored message');
  });

  it('appends to the list and persists to localStorage when addNotification is called', () => {
    render(
      <NotificationHistoryProvider>
        <TestConsumer />
      </NotificationHistoryProvider>
    );
    
    expect(screen.getByTestId('count').textContent).toBe('0');
    
    act(() => {
      screen.getByTestId('addNotification').click();
    });
    
    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(screen.getByTestId('firstMessage').textContent).toBe('Test message');
    
    const stored = JSON.parse(localStorage.getItem('sonner-notification-history') || '[]');
    expect(stored.length).toBe(1);
    expect(stored[0].message).toBe('Test message');
  });

  it('empties the list and clears localStorage when clearHistory() is called', () => {
    render(
      <NotificationHistoryProvider>
        <TestConsumer />
      </NotificationHistoryProvider>
    );
    
    act(() => {
      screen.getByTestId('addNotification').click();
    });
    
    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(localStorage.getItem('sonner-notification-history')).toBeTruthy();
    
    act(() => {
      screen.getByTestId('clearHistory').click();
    });
    
    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(localStorage.getItem('sonner-notification-history')).toBe('[]');
  });

  it('ensures notifications have timestamps', () => {
    render(
      <NotificationHistoryProvider>
        <TestConsumer />
      </NotificationHistoryProvider>
    );
    
    act(() => {
      screen.getByTestId('addNotification').click();
    });
    
    expect(screen.getByTestId('firstTimestamp').textContent).toBe('has-timestamp');
  });

  it('throws when useNotificationHistory is called outside provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useNotificationHistory must be used within NotificationHistoryProvider');

    spy.mockRestore();
  });
});
