import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface NotificationHistoryItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading' | 'promise';
  message: string;
  description?: string;
  timestamp: string;
  read: boolean;
}

interface NotificationHistoryContextType {
  notifications: NotificationHistoryItem[];
  unreadCount: number;
  addNotification: (notification: Omit<NotificationHistoryItem, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearHistory: () => void;
  deleteNotification: (id: string) => void;
}

const NotificationHistoryContext = createContext<NotificationHistoryContextType | undefined>(undefined);

const STORAGE_KEY = 'sonner-notification-history';
const MAX_HISTORY = 100; // Keep last 100 notifications

export const NotificationHistoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>(() => {
    // Load from localStorage on init
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Save to localStorage whenever notifications change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('Failed to save notification history:', error);
    }
  }, [notifications]);

  const addNotification = (notification: Omit<NotificationHistoryItem, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: NotificationHistoryItem = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications(prev => {
      // Add to beginning and limit to MAX_HISTORY
      const updated = [newNotification, ...prev].slice(0, MAX_HISTORY);
      return updated;
    });
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif => notif.id === id ? { ...notif, read: true } : notif)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const clearHistory = () => {
    setNotifications([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationHistoryContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearHistory,
        deleteNotification,
      }}
    >
      {children}
    </NotificationHistoryContext.Provider>
  );
};

export const useNotificationHistory = (): NotificationHistoryContextType => {
  const context = useContext(NotificationHistoryContext);
  if (!context) {
    throw new Error('useNotificationHistory must be used within NotificationHistoryProvider');
  }
  return context;
};
