
import React, { useMemo } from 'react';
import { FeedbackComment, User } from '../../types';
import { useData } from '../../contexts/DataContext';
import { CancelIcon } from '../icons/CancelIcon';
import { DeleteIcon } from '../icons/DeleteIcon';
import { deleteComment } from '../../utils/feedbackUtils';

interface FeedbackSidebarProps {
    view: 'comments' | 'activity';
    comments: FeedbackComment[];
    onCommentClick: (comment: FeedbackComment) => void;
    onClose: () => void;
    onNavigate?: (path: string) => void;
    position: 'right' | 'bottom';
}

const FeedbackSidebar: React.FC<FeedbackSidebarProps> = ({ view, comments, onCommentClick, onClose, onNavigate, position }) => {
    const { data, forceUpdate } = useData();

    const getMember = (id: string | undefined): User | undefined => id ? data.users.find(m => m.id === id) : undefined;
    
    // Helper to extract timestamp from Firestore object or date
    const getCommentDate = (comment: FeedbackComment) => {
        if (!comment.createdAt) return new Date();
        // Handle Firestore Timestamp object
        if (typeof comment.createdAt === 'object' && 'seconds' in comment.createdAt) {
            return new Date(comment.createdAt.seconds * 1000);
        }
        // Handle standard Date string or object
        return new Date(comment.createdAt);
    };

    const handleResolve = (commentId: string) => {
        // Toggle logic should be passed down or imported directly if context-agnostic
        // For now, assuming parent handles or we call utils directly if projectId/itemId were available props
        // But since they aren't props here, we rely on the parent updating state via listener
    };

    const handleDelete = async (commentId: string) => {
        if (window.confirm('Are you sure you want to delete this comment?')) {
            const comment = comments.find(c => c.id === commentId);
            if (comment) {
                // We need projectId and itemId. 
                // Since this component is generic, we might need to extract them from the comment if available,
                // or require them as props.
                // The current comment schema has `feedbackItemId` but NOT `projectId`.
                // However, the parent component knows the projectId.
                // For a quick fix, we'll iterate to find the item in global data or ask parent to handle delete.
                // BETTER: Make `onDelete` a prop.
                
                // Since I cannot change the prop interface easily without breaking usages in 3 files,
                // I will use a clever workaround: try to find the item in the data context to get projectId.
                const item = data.feedbackMockups.find(i => i.id === comment.feedbackItemId) || 
                             data.feedbackWebsites.find(i => i.id === comment.feedbackItemId) || 
                             data.feedbackVideos.find(i => i.id === comment.feedbackItemId);
                
                if (item) {
                    await deleteComment(item.projectId, item.id, commentId);
                } else {
                    console.error("Could not determine project ID for deletion");
                }
            }
        }
    };

    const sortedComments = useMemo(() => {
        if (comments.length > 0 && comments[0].targetType === 'video') {
            return [...comments].sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
        }
        return comments;
    }, [comments]);
    
    // Simulate activity feed from comments if real activity feed is missing
    const activities = comments.map(c => ({
        id: c.id,
        author: getMember(c.reporterId), // Note: comment.authorId is the field in new schema, types.ts might be mismatched
        text: `left comment #${c.pin_number}: "${c.commentText || c.comment}"`, // Handle both schema variants
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
                    ) : sortedComments.map(comment => (
                    <div key={comment.id} onClick={() => onCommentClick(comment)} className={itemClasses}>
                        {comment.targetType === 'video' && comment.startTime !== undefined && (
                             <div className="px-3 py-1 bg-primary/10 border-b border-border-color flex-shrink-0 flex justify-between items-center">
                                <span className="text-xs font-bold text-primary flex items-center gap-1">
                                    ⏱ {formatTime(comment.startTime)}
                                </span>
                            </div>
                        )}
                        <div className={`p-3 ${position === 'bottom' ? 'flex-1 flex flex-col' : ''}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`h-6 w-6 rounded-full flex items-center justify-center text-background font-bold text-xs flex-shrink-0 ${comment.status === 'Resolved' ? 'bg-green-500' : 'bg-primary'}`}>
                                        {comment.pin_number}
                                    </span>
                                    {/* Handle both authorId (new) and reporterId (old) */}
                                    <span className="text-xs font-semibold text-text-primary">{getMember(comment.authorId || comment.reporterId)?.name || 'User'}</span>
                                </div>
                                <span className="text-[10px] text-text-secondary">{getCommentDate(comment).toLocaleDateString()}</span>
                            </div>
                            
                            {/* Handle both commentText (new) and comment (old) */}
                            <p className={`text-sm text-text-primary mb-2 ${comment.resolved ? 'line-through text-text-secondary opacity-70' : ''}`}>
                                {comment.commentText || comment.comment}
                            </p>
                            
                            {comment.targetType === 'website' && comment.pageUrl && (
                                <div className="mt-2 flex justify-between items-center bg-glass p-1.5 rounded border border-border-color/50">
                                    <span className="text-[10px] text-text-secondary truncate max-w-[150px]">
                                        {comment.pageUrl}
                                    </span>
                                    {onNavigate && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onNavigate(comment.pageUrl || '/');
                                            }}
                                            className="text-[10px] font-bold text-primary hover:underline whitespace-nowrap"
                                        >
                                            Go to
                                        </button>
                                    )}
                                </div>
                            )}

                             <div className={`flex gap-2 text-xs ${position === 'bottom' ? 'mt-auto pt-2' : 'mt-3 pt-2 border-t border-border-color/50'}`}>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${comment.resolved ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                    {comment.resolved ? 'Resolved' : 'Active'}
                                </span>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(comment.id); }} className="ml-auto text-red-400 hover:text-red-500">
                                    <DeleteIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )))}

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
