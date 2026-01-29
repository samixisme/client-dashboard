import React, { useState } from 'react';
import { useNotificationHistory } from '../contexts/NotificationHistoryContext';
import { Link } from 'react-router-dom';

// Helper function to calculate relative time
const timeSince = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success': return '✓';
    case 'error': return '✕';
    case 'warning': return '⚠';
    case 'info': return 'ⓘ';
    case 'loading': return '⟳';
    default: return '🔔';
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'success': return 'bg-green-500/10 border-green-500/30 text-green-400';
    case 'error': return 'bg-red-500/10 border-red-500/30 text-red-400';
    case 'warning': return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
    case 'info': return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
    case 'loading': return 'bg-purple-500/10 border-purple-500/30 text-purple-400';
    default: return 'bg-glass-light/60 border-border-color/30';
  }
};

const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearHistory, deleteNotification } = useNotificationHistory();
  const [filter, setFilter] = useState<'all' | 'unread' | 'success' | 'error' | 'warning' | 'info'>('all');

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notif.read;
    return notif.type === filter;
  });

  const handleNotificationClick = (notifId: string) => {
    markAsRead(notifId);
  };

  const handleDeleteNotification = (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    deleteNotification(notifId);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all notification history? This cannot be undone.')) {
      clearHistory();
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">Notification History</h1>
              <p className="text-text-secondary">
                {notifications.length} total notifications
                {unreadCount > 0 && <span className="ml-2 text-primary font-semibold">({unreadCount} unread)</span>}
              </p>
            </div>
            <Link
              to="/"
              className="px-4 py-2 bg-glass hover:bg-glass-light border border-border-color rounded-xl text-text-primary font-semibold transition-all duration-300"
            >
              ← Back to Dashboard
            </Link>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 bg-primary/20 hover:bg-primary/30 border border-primary/50 rounded-xl text-primary font-semibold transition-all duration-300"
              >
                Mark all as read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl text-red-400 font-semibold transition-all duration-300"
              >
                Clear all history
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-text-secondary font-semibold">Filter:</span>
          {['all', 'unread', 'success', 'error', 'warning', 'info'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                filter === f
                  ? 'bg-primary/20 text-primary border border-primary/50'
                  : 'bg-glass hover:bg-glass-light text-text-secondary border border-border-color'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-glass-light/50 mb-6">
              <svg className="w-10 h-10 text-text-secondary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-text-primary font-semibold text-lg mb-2">No notifications</p>
            <p className="text-text-secondary">
              {filter === 'all' ? "You don't have any notifications yet" : `No ${filter} notifications found`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map(notification => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification.id)}
                className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer group hover:scale-[1.02] ${
                  !notification.read
                    ? 'bg-primary/5 border-primary/30'
                    : 'bg-glass hover:bg-glass-light border-border-color'
                }`}
                style={{
                  background: !notification.read ? 'rgba(163, 230, 53, 0.05)' : undefined,
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Unread indicator */}
                  <div className="flex-shrink-0 mt-1">
                    {!notification.read ? (
                      <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                    ) : (
                      <div className="w-3 h-3 rounded-full bg-glass-light" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className={`text-base font-bold ${!notification.read ? 'text-text-primary' : 'text-text-secondary'}`}>
                        {notification.message}
                      </h4>
                      <button
                        onClick={(e) => handleDeleteNotification(e, notification.id)}
                        className="opacity-0 group-hover:opacity-100 text-text-secondary/50 hover:text-red-400 transition-all duration-300 p-2 hover:bg-red-500/10 rounded-lg"
                        title="Delete notification"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    {notification.description && (
                      <p className="text-sm text-text-secondary mb-3">
                        {notification.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold border ${getNotificationColor(notification.type)}`}>
                        <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                        {notification.type}
                      </span>
                      <span className="text-xs text-text-secondary/70">
                        {timeSince(new Date(notification.timestamp))}
                      </span>
                      <span className="text-xs text-text-secondary/50">
                        {new Date(notification.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
