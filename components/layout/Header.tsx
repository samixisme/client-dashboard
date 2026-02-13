
import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useTimer } from '../../contexts/TimerContext';
import { useNotificationHistory } from '../../contexts/NotificationHistoryContext';
import { useUser } from '../../contexts/UserContext';
import { TimerIcon } from '../icons/TimerIcon';
import { Link } from 'react-router-dom';
import { NovuInbox } from '../notifications/NovuInbox';

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

const GlobalTimerWidget: React.FC = () => {
    const { runningTimer, stopTimer } = useTimer();
    const { data } = useData();
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        let interval: number | null = null;
        if (runningTimer) {
            interval = setInterval(() => {
                setElapsedTime(Date.now() - runningTimer.startTime);
            }, 1000);
        } else {
            setElapsedTime(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [runningTimer]);

    if (!runningTimer) {
        return null;
    }

    const task = data.tasks.find(t => t.id === runningTimer.taskId);

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    return (
         <div className="relative group">
            <div className="flex items-center gap-2 h-12 px-4 rounded-2xl bg-green-500/20 text-green-300 border border-green-500/50">
                <TimerIcon className="h-5 w-5 animate-pulse" />
                <span className="font-mono font-semibold">{formatTime(elapsedTime)}</span>
            </div>
            <div className="absolute top-full right-0 pt-2 -mt-2 w-64 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                <div className="bg-glass p-3 rounded-lg border border-border-color shadow-lg">
                    <p className="text-xs text-text-secondary">Timer running for:</p>
                    <p className="font-semibold text-text-primary truncate">{task?.title || 'Unknown Task'}</p>
                    <button onClick={stopTimer} className="w-full mt-3 px-3 py-1.5 bg-red-500/80 text-white text-sm font-bold rounded-lg hover:bg-red-500">
                        Stop Timer
                    </button>
                </div>
            </div>
        </div>
    );
};

const Header: React.FC = () => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { notifications, unreadCount, markAsRead } = useNotificationHistory();
  const { user } = useUser();

  const handleProfileMenuToggle = () => {
    setProfileMenuOpen(prev => !prev);
  };

  const handleNotificationClick = (notifId: string) => {
    markAsRead(notifId);
  };

  // Get user initials for avatar placeholder
  const getInitials = () => {
    if (!user) return 'U';
    const f = (user.firstName || '').charAt(0).toUpperCase();
    const l = (user.lastName || '').charAt(0).toUpperCase();
    return f + l || user.email?.charAt(0).toUpperCase() || 'U';
  };

  // Show only the 3 most recent notifications in dropdown
  const recentNotifications = notifications.slice(0, 3);

  return (
    <div className="flex items-center justify-end space-x-3 flex-wrap">
        <NovuInbox />

        <GlobalTimerWidget />

        {/* User Avatar with Dropdown */}
        <div className="relative">
            <button
              onClick={handleProfileMenuToggle}
              className="relative h-12 w-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary transition-all duration-300"
            >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt="User Avatar"
                    className="h-12 w-12 rounded-xl object-cover border-2 border-border-color hover:border-primary transition-all duration-300 shadow-lg"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white font-bold border-2 border-border-color hover:border-primary transition-all duration-300 shadow-lg">
                    {getInitials()}
                  </div>
                )}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold ring-2 ring-background animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
            </button>

            {profileMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden animate-scale-in"
                  style={{
                    background: 'rgba(28, 28, 28, 0.95)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(163, 230, 53, 0.2)',
                  }}
                >
                    {/* User Info Header */}
                    <div
                      className="p-4 border-b"
                      style={{
                        borderColor: 'rgba(163, 230, 53, 0.1)',
                        background: 'rgba(163, 230, 53, 0.05)',
                      }}
                    >
                        <div className="flex items-center gap-3">
                            {user?.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt="Avatar"
                                className="h-12 w-12 rounded-full object-cover border-2 border-primary shadow-md"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg border-2 border-primary shadow-md">
                                {getInitials()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-text-primary truncate">
                                  {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'User'}
                                </p>
                                <p className="text-xs text-text-secondary truncate">{user?.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Menu Options */}
                    <div className="p-2">
                        {user?.role === 'admin' && (
                          <Link
                            to="/admin"
                            onClick={() => setProfileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-glass-light transition-all duration-200 group"
                          >
                              <svg className="w-5 h-5 text-text-secondary group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                              <span className="text-sm font-medium text-text-primary">Admin Dashboard</span>
                          </Link>
                        )}

                        <Link
                          to="/settings"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-glass-light transition-all duration-200 group"
                        >
                            <svg className="w-5 h-5 text-text-secondary group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-sm font-medium text-text-primary">Settings</span>
                        </Link>

                        <Link
                          to="/profile"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-glass-light transition-all duration-200 group"
                        >
                            <svg className="w-5 h-5 text-text-secondary group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-sm font-medium text-text-primary">Profile</span>
                        </Link>
                    </div>

                    {/* Notifications Section */}
                    {unreadCount > 0 && (
                      <div
                        className="border-t p-2"
                        style={{
                          borderColor: 'rgba(163, 230, 53, 0.1)',
                        }}
                      >
                          <div className="px-4 py-2 flex items-center justify-between">
                              <span className="text-xs font-semibold text-text-secondary">NOTIFICATIONS</span>
                              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">{unreadCount}</span>
                          </div>
                          <div className="max-h-64 overflow-y-auto custom-scrollbar">
                              {recentNotifications.map(notification => (
                                <div
                                  key={notification.id}
                                  onClick={() => {
                                    handleNotificationClick(notification.id);
                                    setProfileMenuOpen(false);
                                  }}
                                  className={`px-4 py-3 rounded-lg hover:bg-glass-light transition-all duration-200 cursor-pointer group ${!notification.read ? 'bg-primary/5' : ''}`}
                                >
                                    <div className="flex items-start gap-2">
                                      <div className="shrink-0 mt-1">
                                        {!notification.read && (
                                          <div className="w-2 h-2 rounded-full bg-primary" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-semibold truncate ${!notification.read ? 'text-text-primary' : 'text-text-secondary'}`}>
                                          {notification.message}
                                        </p>
                                        <p className="text-xs text-text-secondary/70 mt-0.5">
                                          {timeSince(new Date(notification.timestamp))}
                                        </p>
                                      </div>
                                    </div>
                                </div>
                              ))}
                          </div>
                          {notifications.length > 3 && (
                            <Link
                              to="/notifications"
                              onClick={() => setProfileMenuOpen(false)}
                              className="block px-4 py-2 text-center text-xs text-primary hover:text-primary-hover font-semibold"
                            >
                              View all {notifications.length} notifications →
                            </Link>
                          )}
                      </div>
                    )}

                    {/* Sign Out */}
                    <div
                      className="border-t p-2"
                      style={{
                        borderColor: 'rgba(163, 230, 53, 0.1)',
                      }}
                    >
                        <button
                          onClick={() => {
                            setProfileMenuOpen(false);
                            // Add your logout logic here
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-500/10 transition-all duration-200 group"
                        >
                            <svg className="w-5 h-5 text-text-secondary group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="text-sm font-medium text-text-primary group-hover:text-red-400 transition-colors">Sign out</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default Header;
