


import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useTimer } from '../../contexts/TimerContext';
import { TimerIcon } from '../icons/TimerIcon';
import { BellIcon } from '../icons/BellIcon';
import { Activity } from '../../types';
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

const GlobalTimerWidget: React.FC = () => {
    const { runningTimer, stopTimer } = useTimer();
    const { data } = useData();
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        // FIX: Use 'number' for browser environments instead of 'NodeJS.Timeout'.
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { data } = useData();
  const [unreadActivityIds, setUnreadActivityIds] = useState<Set<string>>(new Set());

  // Sort activities once, newest first
  const sortedActivities = React.useMemo(() => 
    [...data.activities].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
  [data.activities]);

  useEffect(() => {
    // Initially, all activities are unread. In a real app, this would come from a server.
    setUnreadActivityIds(new Set(sortedActivities.map(a => a.id)));
  }, [sortedActivities]);

  const handleNotificationsToggle = () => {
    setNotificationsOpen(prev => !prev);
    // When opening the panel, mark all as read
    if (!notificationsOpen) {
      setTimeout(() => setUnreadActivityIds(new Set()), 1000); // Delay to allow reading animation
    }
  };
  
  const hasUnread = unreadActivityIds.size > 0;

  const formatTimestamp = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center justify-end space-x-3 flex-wrap">
        {/* Global Timer */}
        <GlobalTimerWidget />
        
        {/* Notification bell */}
        <div className="relative">
            <button onClick={handleNotificationsToggle} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-glass text-text-secondary hover:bg-glass-light hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary border border-border-color relative">
                <BellIcon className="h-6 w-6" />
                {hasUnread && <span className="absolute top-2.5 right-2.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-surface"></span>}
            </button>
            {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-glass rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 z-10 border border-border-color">
                    <div className="p-4 border-b border-border-color">
                        <h3 className="font-semibold text-text-primary">Notifications</h3>
                    </div>
                    <div className="py-1 max-h-96 overflow-y-auto">
                        {sortedActivities.map(activity => {
                            const comment = data.feedbackComments.find(c => c.id === activity.objectId);
                            const isVideoCommentActivity = activity.objectType === 'comment' && comment?.targetType === 'video' && activity.video_screenshot_url;
                            
                            if (isVideoCommentActivity && comment) {
                                const video = data.feedbackVideos.find(v => v.id === comment.targetId);
                                const linkTo = `/feedback/${comment.projectId}/video/${video?.id}?videoAssetId=${comment.videoAssetId}&t=${activity.comment_timestamp_seconds}`;
                                
                                return (
                                    <Link to={linkTo} key={activity.id} onClick={() => setNotificationsOpen(false)} className="block px-4 py-3 hover:bg-glass-light">
                                        <div className="flex items-start gap-3">
                                            {unreadActivityIds.has(activity.id) && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>}
                                            {!unreadActivityIds.has(activity.id) && <div className="w-2 h-2 flex-shrink-0"></div>}
                                            <div className="flex-1">
                                                <p className="text-sm text-text-primary">{activity.description}</p>
                                                <p className="text-xs text-text-secondary mt-1">{timeSince(new Date(activity.timestamp))}</p>
                                                <div className="mt-2 flex items-start gap-3 bg-surface-light p-2 rounded-md">
                                                    <img src={activity.video_screenshot_url} alt="video frame" className="w-24 h-14 object-cover rounded" />
                                                    <div>
                                                        <p className="text-sm font-semibold text-text-primary">{video?.name}</p>
                                                        <p className="text-xs text-text-secondary">Comment at {formatTimestamp(activity.comment_timestamp_seconds || 0)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            }

                            return (
                                <div key={activity.id} className="px-4 py-3 hover:bg-glass-light flex items-start gap-3">
                                    {unreadActivityIds.has(activity.id) && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0"></div>}
                                    {!unreadActivityIds.has(activity.id) && <div className="w-2 h-2 flex-shrink-0"></div>}
                                    <div className="flex-1">
                                        <p className="text-sm text-text-primary">{activity.description}</p>
                                        <p className="text-xs text-text-secondary mt-1">{timeSince(new Date(activity.timestamp))}</p>
                                    </div>
                                </div>
                            );
                        })}
                         {sortedActivities.length === 0 && (
                            <p className="text-center text-sm text-text-secondary p-4">No new notifications.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default Header;