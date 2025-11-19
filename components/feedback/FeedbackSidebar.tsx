
import React, { useMemo } from 'react';
import { FeedbackComment, BoardMember } from '../../types';
import { useData } from '../../contexts/DataContext';
import { CancelIcon } from '../icons/CancelIcon';
import { DeleteIcon } from '../icons/DeleteIcon';

interface FeedbackSidebarProps {
    view: 'comments' | 'activity';
    comments: FeedbackComment[];
    onCommentClick: (comment: FeedbackComment) => void;
    onClose: () => void;
    onNavigate: (path: string) => void;
    position: 'right' | 'bottom';
}

const FeedbackSidebar: React.FC<FeedbackSidebarProps> = ({ view, comments, onCommentClick, onClose, onNavigate, position }) => {
    const { data, forceUpdate } = useData();

    const getMember = (id: string | undefined): BoardMember | undefined => id ? data.board_members.find(m => m.id === id) : undefined;
    
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
    
    const activities = comments.map(c => ({
        id: c.id,
        author: getMember(c.reporterId),
        text: `left comment #${c.pin_number}: "${c.comment}"`,
        timestamp: c.timestamp,
    }));

    const formatTime = (timeInSeconds: number) => {
        const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
        const seconds = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    };


    const containerClasses = position === 'right' 
        ? 'w-80 flex-shrink-0 bg-glass border border-border-color rounded-lg flex flex-col'
        : 'h-64 flex-shrink-0 bg-glass border border-border-color rounded-lg flex flex-col';

    const listClasses = position === 'right'
        ? 'flex-1 overflow-y-auto p-4 space-y-4'
        : 'flex-1 overflow-x-auto p-4 flex flex-row gap-4';

    const itemClasses = position === 'right'
        ? 'bg-surface-light rounded-lg cursor-pointer hover:ring-2 hover:ring-primary overflow-hidden'
        : 'bg-surface-light rounded-lg cursor-pointer hover:ring-2 hover:ring-primary overflow-hidden w-72 flex-shrink-0 flex flex-col';
    
    const activityItemClasses = position === 'right'
        ? 'flex items-start gap-3'
        : 'flex items-start gap-3 w-72 flex-shrink-0';

    return (
        <div className={containerClasses}>
            <div className="flex justify-between items-center p-4 border-b border-border-color flex-shrink-0">
                <h3 className="font-semibold text-text-primary capitalize">{view}</h3>
                <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:bg-glass-light hover:text-text-primary">
                    <CancelIcon className="w-5 h-5"/>
                </button>
            </div>
            <div className={listClasses}>
                {view === 'comments' && sortedComments.map(comment => (
                    <div key={comment.id} onClick={() => onCommentClick(comment)} className={itemClasses}>
                        {comment.targetType === 'video' && comment.startTime !== undefined && (
                             <div className="px-3 py-1 bg-surface border-b border-border-color flex-shrink-0">
                                <p className="text-xs text-text-secondary font-semibold">
                                    Timestamp: <span className="font-mono text-text-primary">{formatTime(comment.startTime)} - {formatTime(comment.endTime || comment.startTime)}</span>
                                </p>
                            </div>
                        )}
                        <div className={`p-3 ${position === 'bottom' ? 'flex-1 flex flex-col' : ''}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`h-8 w-8 rounded-full flex items-center justify-center text-background font-bold text-sm flex-shrink-0 ${comment.status === 'Resolved' ? 'bg-green-500' : 'bg-primary'}`}>
                                        {comment.pin_number}
                                    </span>
                                    <span className="text-sm font-semibold">{getMember(comment.reporterId)?.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {comment.deviceView && (
                                        <span className="text-xs font-medium text-text-secondary bg-surface px-2 py-0.5 rounded-md capitalize">{comment.deviceView}</span>
                                    )}
                                    <span className={`text-xs font-bold ${comment.status === 'Resolved' ? 'text-green-400' : 'text-yellow-400'}`}>{comment.status}</span>
                                </div>
                            </div>
                            <p className="text-sm text-text-secondary">{comment.comment}</p>
                            {comment.targetType === 'website' && (
                                <div className="mt-2 flex justify-between items-center">
                                    <p className="text-xs text-text-secondary">
                                        Page: <span className="font-mono text-text-primary">{comment.pageUrl || '/'}</span>
                                    </p>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onNavigate(comment.pageUrl || '/');
                                        }}
                                        className="text-xs font-semibold text-primary hover:underline"
                                    >
                                        Go to page
                                    </button>
                                </div>
                            )}
                            <div className={`flex gap-2 text-xs ${position === 'bottom' ? 'mt-auto pt-2' : 'mt-3'}`}>
                                {comment.status === 'Active' && <button onClick={(e) => { e.stopPropagation(); handleResolve(comment.id); }} className="text-green-400 hover:underline">Resolve</button>}
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(comment.id); }} className="text-red-400 hover:underline">Delete</button>
                            </div>
                        </div>
                    </div>
                ))}

                {view === 'activity' && activities.map(activity => (
                    <div key={activity.id} className={activityItemClasses}>
                         <img src={activity.author?.avatarUrl} className="w-8 h-8 rounded-full" />
                         <div>
                             <p className="text-sm text-text-secondary">
                                <span className="font-bold text-text-primary">{activity.author?.name}</span> {activity.text}
                            </p>
                            <p className="text-xs text-text-secondary mt-1">{new Date(activity.timestamp).toLocaleDateString()}</p>
                         </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FeedbackSidebar;
