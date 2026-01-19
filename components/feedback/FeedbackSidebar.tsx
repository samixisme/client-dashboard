import React, { useMemo, useState, useEffect } from 'react';
import { FeedbackComment, FeedbackItemComment, User } from '../../types';
import { useData } from '../../contexts/DataContext';
import { CancelIcon } from '../icons/CancelIcon';
import { DeleteIcon } from '../icons/DeleteIcon';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { SidebarView } from './FeedbackItemPage'; 
import CommentPopover from './CommentPopover'; 

// Reusing CommentPopover logic but adapting for Sidebar (Detail View)
// We will extract the "Thread" logic later if needed, but for now we can render a "Detail" component here.
// Or we can modify CommentPopover to be embeddable? 
// Actually, `CommentPopover` is designed as a popover with fixed/absolute positioning.
// We should create a dedicated `CommentDetail` component or inline the logic here.
// To save tokens and time, I will inline the detail logic here, inspired by CommentPopover.

interface FeedbackSidebarProps {
    view: SidebarView; 
    onViewChange: (view: SidebarView) => void; 
    comments: (FeedbackComment | FeedbackItemComment)[];
    externalActivities?: any[]; 
    onCommentClick: (comment: FeedbackComment | FeedbackItemComment) => void;
    onClose: () => void;
    onNavigate?: (path: string) => void;
    onDelete: (commentId: string) => void; 
    onResolve?: (commentId: string) => void; 
    onUpdate?: (commentId: string, updates: Partial<FeedbackComment>) => void; // Added for reply/update
    position: 'right' | 'bottom';
    onGoToPage?: (url: string, device: string) => void; 
    users?: User[]; 
}

const FeedbackSidebar: React.FC<FeedbackSidebarProps> = ({ 
    view, 
    onViewChange, 
    comments, 
    externalActivities, 
    onCommentClick, 
    onClose, 
    onNavigate, 
    onDelete, 
    onResolve,
    onUpdate,
    position, 
    onGoToPage, 
    users 
}) => {
    const { data } = useData();
    const userList = users || data?.users || [];
    const getMember = (id: string | undefined): User | undefined => id ? userList.find(m => m.id === id) : undefined;
    
    // Internal state for selected comment (Detail View)
    const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');

    const selectedComment = useMemo(() => 
        comments.find(c => c.id === selectedCommentId), 
    [comments, selectedCommentId]);

    // When props change (e.g. from parent "PIN_CLICKED"), update selection if logic allows.
    // NOTE: The parent `FeedbackWebsiteDetailPage` handles `PIN_CLICKED` by finding the comment
    // and scrolling to it. If it wants to SELECT it in the sidebar, it needs to tell us.
    // Currently, `FeedbackWebsiteDetailPage` just opens the sidebar.
    // To support external selection, we might need a prop `activeCommentId`?
    // For now, let's assume the user CLICKS in the sidebar to enter detail view.
    // If we want "Pin Click" -> "Sidebar Detail", we need to sync state.
    // But the user request said: "When clicking on the comment *in the sidebar*..."
    
    const handleCommentClickInternal = (comment: FeedbackComment | FeedbackItemComment) => {
        setSelectedCommentId(comment.id);
        onCommentClick(comment); // Still notify parent to scroll to pin
    };

    const handleBackToList = () => {
        setSelectedCommentId(null);
    };

    const handleReplySubmit = () => {
        if (!selectedComment || !replyText.trim() || !onUpdate) return;
        
        const newReply = {
            id: `rep-${Date.now()}`,
            authorId: 'user-1', // Mock current user or get from auth
            text: replyText,
            timestamp: new Date().toISOString(),
            replies: []
        };
        
        // We need to construct the full replies array
        const currentReplies = (selectedComment as FeedbackComment).replies || [];
        onUpdate(selectedComment.id, {
            replies: [...currentReplies, newReply]
        });
        setReplyText('');
    };
    
    // Helper accessors
    const getCommentText = (c: FeedbackComment | FeedbackItemComment) => 
        (c as FeedbackItemComment).commentText || (c as FeedbackComment).comment;
    const getAuthorId = (c: FeedbackComment | FeedbackItemComment) => 
        (c as FeedbackItemComment).authorId || (c as FeedbackComment).reporterId;
    const getVideoTime = (c: FeedbackComment | FeedbackItemComment) => 
        (c as FeedbackItemComment).timestamp ?? (c as FeedbackComment).startTime;
    const getPageUrl = (c: FeedbackComment | FeedbackItemComment) => 
        (c as FeedbackComment).pageUrl || (c as FeedbackComment).pageUrl;
    const getCommentDate = (comment: FeedbackComment | FeedbackItemComment) => {
        if ('createdAt' in comment && comment.createdAt) {
            if (typeof comment.createdAt === 'object' && 'seconds' in comment.createdAt) {
                return new Date(comment.createdAt.seconds * 1000);
            }
            return new Date(comment.createdAt);
        }
        if ('timestamp' in comment && typeof comment.timestamp === 'string') {
            return new Date(comment.timestamp);
        }
        return new Date();
    };

    const sortedComments = useMemo(() => {
        const hasTime = comments.some(c => getVideoTime(c) !== undefined);
        if (hasTime) {
            return [...comments].sort((a, b) => (getVideoTime(a) || 0) - (getVideoTime(b) || 0));
        }
        return comments;
    }, [comments]);
    
    // Activities logic (same as before)
    const activities = useMemo(() => {
        const newActivities: { id: string, author: User | undefined, text: string, timestamp: Date }[] = [];
        comments.forEach(c => {
            const author = getMember(getAuthorId(c));
            const commentDate = getCommentDate(c);
            newActivities.push({
                id: `activity-comment-${c.id}`,
                author,
                text: `left comment #${c.pin_number || '•'}: "${getCommentText(c).substring(0, 50)}..."`,
                timestamp: commentDate,
            });
            if ((c as FeedbackComment).status) {
                newActivities.push({
                    id: `activity-status-${c.id}`,
                    author,
                    text: `set status to '${(c as FeedbackComment).status}'`,
                    timestamp: commentDate,
                });
            }
        });
        if (externalActivities) {
            externalActivities.forEach(act => {
                const author = getMember(act.userId);
                let date = new Date();
                if (act.timestamp) {
                    if (act.timestamp.seconds) date = new Date(act.timestamp.seconds * 1000);
                    else if (typeof act.timestamp === 'string') date = new Date(act.timestamp);
                }
                newActivities.push({
                    id: act.id,
                    author,
                    text: act.description || 'performed an action',
                    timestamp: date
                });
            });
        }
        return newActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }, [comments, userList, externalActivities]);


    // Classes
    const containerClasses = position === 'right' 
        ? 'w-96 flex-shrink-0 bg-glass border-l border-border-color flex flex-col h-full'
        : 'h-72 flex-shrink-0 bg-glass border-t border-border-color flex flex-col w-full';

    const listClasses = position === 'right'
        ? 'flex-1 overflow-y-auto p-4 space-y-4'
        : 'flex-1 overflow-x-auto p-4 flex flex-row gap-4';

    const itemClasses = position === 'right'
        ? 'bg-glass-light border border-border-color rounded-lg cursor-pointer hover:border-primary transition-all overflow-hidden'
        : 'bg-glass-light border border-border-color rounded-lg cursor-pointer hover:border-primary transition-all overflow-hidden w-72 flex-shrink-0 flex flex-col';

    const formatTime = (timeInSeconds: number) => {
        const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
        const seconds = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    };

    return (
        <div className={containerClasses}>
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-border-color flex-shrink-0 bg-glass">
                {selectedCommentId ? (
                     <div className="flex items-center gap-2">
                        <button onClick={handleBackToList} className="p-1 hover:bg-glass-light rounded-full text-text-secondary hover:text-text-primary transition-colors">
                            <ArrowLeftIcon className="w-5 h-5"/>
                        </button>
                        <span className="font-bold text-text-primary">Comment #{selectedComment?.pin_number}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => onViewChange('comments')}
                            className={`font-bold text-text-primary ${view === 'comments' ? 'border-b-2 border-primary' : ''}`}
                        >
                            Comments
                        </button>
                        <button 
                            onClick={() => onViewChange('activity')}
                            className={`font-bold text-text-primary ${view === 'activity' ? 'border-b-2 border-primary' : ''}`}
                        >
                            Activity
                        </button>
                    </div>
                )}
                <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:bg-glass-light hover:text-text-primary">
                    <CancelIcon className="w-5 h-5"/>
                </button>
            </div>

            {/* Content */}
            <div className={`${listClasses} relative`}>
                {view === 'comments' && !selectedCommentId && (
                    sortedComments.length === 0 ? (
                         <div className="text-center text-text-secondary py-10 w-full">
                            <p className="text-2xl mb-2">💬</p>
                            <p className="text-sm">No comments yet.</p>
                        </div>
                    ) : sortedComments.map(comment => {
                         const videoTime = getVideoTime(comment);
                        return (
                            <div key={comment.id} onClick={() => handleCommentClickInternal(comment)} className={itemClasses}>
                                {videoTime !== undefined && (
                                     <div className="px-3 py-1 bg-primary/10 border-b border-border-color flex-shrink-0 flex justify-between items-center">
                                        <span className="text-xs font-bold text-primary flex items-center gap-1">⏱ {formatTime(videoTime)}</span>
                                    </div>
                                )}
                                <div className={`p-3 ${position === 'bottom' ? 'flex-1 flex flex-col' : ''}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-background font-bold text-xs flex-shrink-0 ${comment.status === 'Resolved' || (comment as any).resolved ? 'bg-green-500' : 'bg-primary'}`}>
                                                {comment.pin_number || '•'}
                                            </span>
                                            <span className="text-xs font-semibold text-text-primary">{getMember(getAuthorId(comment))?.name || 'User'}</span>
                                        </div>
                                        <span className="text-[10px] text-text-secondary">{getCommentDate(comment).toLocaleDateString()}</span>
                                    </div>
                                    <p className={`text-sm text-text-primary mb-2 ${(comment as FeedbackItemComment).resolved || comment.status === 'Resolved' ? 'line-through text-text-secondary opacity-70' : ''}`}>
                                        {getCommentText(comment)}
                                    </p>
                                    <div className={`flex gap-2 text-xs ${position === 'bottom' ? 'mt-auto pt-2' : 'mt-3 pt-2 border-t border-border-color/50'}`}>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onResolve && onResolve(comment.id); }}
                                            className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity ${(comment as FeedbackItemComment).resolved || comment.status === 'Resolved' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}
                                        >
                                            {(comment as FeedbackItemComment).resolved || comment.status === 'Resolved' ? 'Resolved' : 'Active'}
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete?')) onDelete(comment.id); }} className="ml-auto text-red-400 hover:text-red-500 p-1 hover:bg-red-500/10 rounded">
                                            <DeleteIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Detail View */}
                {view === 'comments' && selectedCommentId && selectedComment && (
                    <div className="flex flex-col h-full w-full animate-in fade-in slide-in-from-right-4 duration-200">
                        {/* Original Comment */}
                        <div className="bg-glass-light border border-border-color rounded-lg p-4 mb-4">
                            <div className="flex items-start gap-3">
                                <img src={getMember(getAuthorId(selectedComment))?.avatarUrl} className="w-8 h-8 rounded-full bg-primary/20" />
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-text-primary text-sm">{getMember(getAuthorId(selectedComment))?.name || 'User'}</span>
                                        <span className="text-xs text-text-secondary">{getCommentDate(selectedComment).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm text-text-primary mt-1">{getCommentText(selectedComment)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Thread */}
                        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                            {(selectedComment as FeedbackComment).replies?.map((reply: any) => (
                                <div key={reply.id} className="flex items-start gap-3 pl-4 border-l-2 border-border-color">
                                    <img src={getMember(reply.authorId)?.avatarUrl} className="w-6 h-6 rounded-full bg-primary/20" />
                                    <div className="flex-1 bg-glass-light/50 p-2 rounded-lg">
                                        <span className="font-bold text-text-primary text-xs block">{getMember(reply.authorId)?.name || 'User'}</span>
                                        <p className="text-sm text-text-primary mt-1">{reply.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Reply Input */}
                        <div className="mt-auto border-t border-border-color pt-4">
                            <textarea
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                placeholder="Reply..."
                                className="w-full bg-glass-light border border-border-color rounded-lg p-2 text-sm text-text-primary focus:border-primary outline-none resize-none"
                                rows={2}
                            />
                            <div className="flex justify-end mt-2">
                                <button 
                                    onClick={handleReplySubmit}
                                    disabled={!replyText.trim()}
                                    className="px-4 py-2 bg-primary text-background font-bold text-xs rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Reply
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'activity' && (
                     activities.length === 0 ? (
                        <div className="text-center text-text-secondary py-10">No recent activity.</div>
                    ) : activities.map((activity, i) => (
                        <div key={activity.id} className={position === 'right' ? 'flex items-start gap-3 p-3 bg-glass-light rounded-lg border border-border-color' : 'flex items-start gap-3 w-72 flex-shrink-0 p-3 bg-glass-light rounded-lg border border-border-color'}>
                             <img src={activity.author?.avatarUrl} className="w-8 h-8 rounded-full bg-primary/20" />
                             <div>
                                 <p className="text-sm text-text-secondary">
                                    <span className="font-bold text-text-primary">{activity.author?.name || 'User'}</span> {activity.text}
                                </p>
                                <p className="text-[10px] text-text-secondary mt-1">{activity.timestamp.toLocaleString()}</p>
                             </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default FeedbackSidebar;
