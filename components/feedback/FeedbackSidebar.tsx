
import React, { useMemo } from 'react';
import { FeedbackComment, User } from '../../types';
import { useData } from '../../contexts/DataContext';
import { CancelIcon } from '../icons/CancelIcon';

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
    
    const handleResolve = (commentId: string) => {
        const comment = data.feedbackComments.find(c => c.id === commentId);
        if (comment) {
            comment.status = 'Resolved';
            forceUpdate();
        }
    };

    const handleDelete = (commentId: string) => {
        if (window.confirm('Are you sure you want to delete this comment?')) {
            const index = data.feedbackComments.findIndex(c => c.id === commentId);
            if (index > -1) {
                data.feedbackComments.splice(index, 1);
                forceUpdate();
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
        author: getMember(c.reporterId),
        text: `left comment #${c.pin_number}: "${c.comment}"`,
        timestamp: c.timestamp,
    })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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
                                    <span className="text-xs font-semibold text-text-primary">{getMember(comment.reporterId)?.name || 'User'}</span>
                                </div>
                                <span className="text-[10px] text-text-secondary">{new Date(comment.timestamp).toLocaleDateString()}</span>
                            </div>
                            
                            <p className={`text-sm text-text-primary mb-2 ${comment.resolved ? 'line-through text-text-secondary opacity-70' : ''}`}>
                                {comment.comment}
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
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${comment.status === 'Resolved' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                    {comment.status}
                                </span>
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
                            <p className="text-[10px] text-text-secondary mt-1">{new Date(activity.timestamp).toLocaleString()}</p>
                         </div>
                    </div>
                )))}
            </div>
        </div>
    );
};

export default FeedbackSidebar;
