import React, { useMemo } from 'react';
import { FeedbackComment, FeedbackItemComment, User } from '../../types';
import { useData } from '../../contexts/DataContext';
import { CancelIcon } from '../icons/CancelIcon';
import { DeleteIcon } from '../icons/DeleteIcon';

interface FeedbackSidebarProps {
    view: 'comments' | 'activity';
    comments: (FeedbackComment | FeedbackItemComment)[];
    onCommentClick: (comment: FeedbackComment | FeedbackItemComment) => void;
    onClose: () => void;
    onNavigate?: (path: string) => void;
    onDelete: (commentId: string) => void; 
    onResolve?: (commentId: string) => void; 
    position: 'right' | 'bottom';
    onGoToPage?: (url: string, device: string) => void; // Task 3.2
}

const FeedbackSidebar: React.FC<FeedbackSidebarProps> = ({ view, comments, onCommentClick, onClose, onNavigate, onDelete, onResolve, position, onGoToPage }) => {
    const { data } = useData();

    const getMember = (id: string | undefined): User | undefined => id ? data.users.find(m => m.id === id) : undefined;
    
    // Helpers to normalize data between FeedbackComment and FeedbackItemComment
    const getCommentText = (c: FeedbackComment | FeedbackItemComment) => 
        (c as FeedbackItemComment).commentText || (c as FeedbackComment).comment;

    const getAuthorId = (c: FeedbackComment | FeedbackItemComment) => 
        (c as FeedbackItemComment).authorId || (c as FeedbackComment).reporterId;

    const getVideoTime = (c: FeedbackComment | FeedbackItemComment) => 
        (c as FeedbackItemComment).timestamp ?? (c as FeedbackComment).startTime;

    const getPageUrl = (c: FeedbackComment | FeedbackItemComment) => 
        (c as FeedbackItemComment).pageUrl || (c as FeedbackComment).pageUrl;

    const isVideoComment = (c: FeedbackComment | FeedbackItemComment) => 
        (c as FeedbackComment).targetType === 'video' || getVideoTime(c) !== undefined;

    const getCommentDate = (comment: FeedbackComment | FeedbackItemComment) => {
        if (!comment.createdAt) return new Date();
        if (typeof comment.createdAt === 'object' && 'seconds' in comment.createdAt) {
            return new Date(comment.createdAt.seconds * 1000);
        }
        return new Date(comment.createdAt);
    };

    const handleDeleteClick = (e: React.MouseEvent, commentId: string) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this comment?')) {
            onDelete(commentId);
        }
    };

    const handleResolveClick = (e: React.MouseEvent, commentId: string) => {
        e.stopPropagation();
        if (onResolve) {
            onResolve(commentId);
        }
    };

    const sortedComments = useMemo(() => {
        // If it looks like a video comment list (has timestamps), sort by timestamp
        const hasTime = comments.some(c => getVideoTime(c) !== undefined);
        if (hasTime) {
            return [...comments].sort((a, b) => (getVideoTime(a) || 0) - (getVideoTime(b) || 0));
        }
        return comments;
    }, [comments]);
    
    const activities = comments.map(c => ({
        id: c.id,
        author: getMember(getAuthorId(c)),
        text: `left comment #${c.pin_number || '•'}: "${getCommentText(c)}"`,
        timestamp: getCommentDate(c),
    })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const formatTime = (timeInSeconds: number) => {
        const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
        const seconds = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    };

    const containerClasses = position === 'right' 
        ? 'w-96 flex-shrink-0 bg-glass border-l border-border-color flex flex-col h-full'
        : 'h-72 flex-shrink-0 bg-glass border-t border-border-color flex flex-col w-full';

    const listClasses = position === 'right'
        ? 'flex-1 overflow-y-auto p-4 space-y-4'
        : 'flex-1 overflow-x-auto p-4 flex flex-row gap-4';

    const itemClasses = position === 'right'
        ? 'bg-glass-light border border-border-color rounded-lg cursor-pointer hover:border-primary transition-all overflow-hidden'
        : 'bg-glass-light border border-border-color rounded-lg cursor-pointer hover:border-primary transition-all overflow-hidden w-72 flex-shrink-0 flex flex-col';
    
    const activityItemClasses = position === 'right'
        ? 'flex items-start gap-3 p-3 bg-glass-light rounded-lg border border-border-color'
        : 'flex items-start gap-3 w-72 flex-shrink-0 p-3 bg-glass-light rounded-lg border border-border-color';

    return (
        <div className={containerClasses}>
            <div className="flex justify-between items-center p-4 border-b border-border-color flex-shrink-0 bg-glass">
                <h3 className="font-bold text-text-primary capitalize">{view}</h3>
                <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:bg-glass-light hover:text-text-primary">
                    <CancelIcon className="w-5 h-5"/>
                </button>
            </div>
            <div className={listClasses}>
                {view === 'comments' && (
                    sortedComments.length === 0 ? (
                         <div className="text-center text-text-secondary py-10">
                            <p className="text-2xl mb-2">💬</p>
                            <p className="text-sm">No comments yet.</p>
                        </div>
                    ) : sortedComments.map(comment => {
                        const videoTime = getVideoTime(comment);
                        const pageUrl = getPageUrl(comment);
                        const commentText = getCommentText(comment);
                        const authorId = getAuthorId(comment);

                        return (
                        <div key={comment.id} onClick={() => onCommentClick(comment)} className={itemClasses}>
                            {videoTime !== undefined && (
                                 <div className="px-3 py-1 bg-primary/10 border-b border-border-color flex-shrink-0 flex justify-between items-center">
                                    <span className="text-xs font-bold text-primary flex items-center gap-1">
                                        ⏱ {formatTime(videoTime)}
                                    </span>
                                </div>
                            )}
                            <div className={`p-3 ${position === 'bottom' ? 'flex-1 flex flex-col' : ''}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`h-6 w-6 rounded-full flex items-center justify-center text-background font-bold text-xs flex-shrink-0 ${comment.status === 'Resolved' || comment.resolved ? 'bg-green-500' : 'bg-primary'}`}>
                                            {comment.pin_number || '•'}
                                        </span>
                                        <span className="text-xs font-semibold text-text-primary">{getMember(authorId)?.name || 'User'}</span>
                                    </div>
                                    <span className="text-[10px] text-text-secondary">{getCommentDate(comment).toLocaleDateString()}</span>
                                </div>
                                
                                <p className={`text-sm text-text-primary mb-2 ${(comment as any).resolved || (comment as any).status === 'Resolved' ? 'line-through text-text-secondary opacity-70' : ''}`}>
                                    {commentText}
                                </p>
                                
                                {pageUrl && (
                                    <div className="mt-2 flex justify-between items-center bg-glass p-1.5 rounded border border-border-color/50">
                                        <span className="text-[10px] text-text-secondary truncate max-w-[150px]">
                                            {pageUrl}
                                        </span>
                                        {/* Task 3.2: Deep-Link Button */}
                                        {(onGoToPage || onNavigate) && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onGoToPage && pageUrl) onGoToPage(pageUrl, (comment as any).deviceView || 'desktop');
                                                    else if (onNavigate) onNavigate(pageUrl || '/');
                                                }}
                                                className="text-[10px] font-bold text-primary hover:underline whitespace-nowrap"
                                            >
                                                Go to Page ↗
                                            </button>
                                        )}
                                    </div>
                                )}

                                 <div className={`flex gap-2 text-xs ${position === 'bottom' ? 'mt-auto pt-2' : 'mt-3 pt-2 border-t border-border-color/50'}`}>
                                    <button 
                                        onClick={(e) => handleResolveClick(e, comment.id)}
                                        className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity ${(comment as any).resolved || (comment as any).status === 'Resolved' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}
                                    >
                                        {(comment as any).resolved || (comment as any).status === 'Resolved' ? 'Resolved' : 'Active'}
                                    </button>
                                    <button onClick={(e) => handleDeleteClick(e, comment.id)} className="ml-auto text-red-400 hover:text-red-500 p-1 hover:bg-red-500/10 rounded">
                                        <DeleteIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }))}

                {view === 'activity' && (
                    activities.length === 0 ? (
                        <div className="text-center text-text-secondary py-10">No recent activity.</div>
                    ) : activities.map((activity, i) => (
                    <div key={i} className={activityItemClasses}>
                         <img src={activity.author?.avatarUrl} className="w-8 h-8 rounded-full bg-primary/20" />
                         <div>
                             <p className="text-sm text-text-secondary">
                                <span className="font-bold text-text-primary">{activity.author?.name || 'User'}</span> {activity.text.replace(/left comment #\d+: /, 'commented: ')}
                            </p>
                            <p className="text-[10px] text-text-secondary mt-1">{activity.timestamp.toLocaleString()}</p>
                         </div>
                    </div>
                )))}
            </div>
        </div>
    );
};

export default FeedbackSidebar;