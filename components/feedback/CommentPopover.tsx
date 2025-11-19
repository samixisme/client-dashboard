import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';
import { FeedbackComment } from '../../types';
import { useData } from '../../contexts/DataContext';
import { DeleteIcon } from '../icons/DeleteIcon';

interface CommentPopoverProps {
    comment: FeedbackComment | null;
    coords: { x: number; y: number } | null;
    contentRef: React.RefObject<HTMLDivElement>;
    zoom: number;
    onClose: () => void;
    onSubmit: (text: string, details?: { startTime?: number, endTime?: number; dueDate?: string; }) => void;
    onUpdate?: (commentId: string, updates: Partial<FeedbackComment>) => void;
    onResolve?: (commentId: string) => void;
    onDelete?: (commentId: string) => void;
    targetType?: 'website' | 'mockup' | 'video';
    videoCurrentTime?: number;
}

const CommentPopover: React.FC<CommentPopoverProps> = ({ comment, coords, contentRef, zoom, onClose, onSubmit, onUpdate, onResolve, onDelete, targetType, videoCurrentTime }) => {
    const { data, forceUpdate } = useData();
    const { board_members } = data;
    const [newReply, setNewReply] = useState('');
    const popoverRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({});
    
    const [startTime, setStartTime] = useState(comment?.startTime ?? videoCurrentTime ?? 0);
    const [endTime, setEndTime] = useState(comment?.endTime ?? (videoCurrentTime ? videoCurrentTime + 5 : 5));
    const [isEditingTime, setIsEditingTime] = useState(false);
    const [dueDate, setDueDate] = useState(comment?.dueDate || '');

    useEffect(() => {
        setDueDate(comment?.dueDate || '');
    }, [comment]);


    useLayoutEffect(() => {
        if (contentRef.current && popoverRef.current) {
            const contentRect = contentRef.current.getBoundingClientRect();
            const popoverRect = popoverRef.current.getBoundingClientRect();

            let top, left;

            if (coords) { // Position based on coordinates for mockups/websites/video pins
                top = coords.y * zoom + contentRect.top + 20;
                left = coords.x * zoom + contentRect.left;
                
                // Adjust for popover size to keep it in viewport
                if (left + popoverRect.width > window.innerWidth - 16) {
                    left = coords.x * zoom + contentRect.left - popoverRect.width;
                }
                if (top + popoverRect.height > window.innerHeight - 16) {
                    top = coords.y * zoom + contentRect.top - popoverRect.height - 20;
                }
            } else { // Center for video new comment without pin placement
                const viewport = contentRef.current.parentElement;
                if (viewport) {
                    const viewportRect = viewport.getBoundingClientRect();
                    top = viewportRect.top + (viewportRect.height - popoverRect.height) / 2;
                    left = viewportRect.left + (viewportRect.width - popoverRect.width) / 2;
                } else {
                     top = window.innerHeight / 2 - popoverRect.height / 2;
                     left = window.innerWidth / 2 - popoverRect.width / 2;
                }
            }

            setStyle({
                position: 'fixed',
                top: `${Math.max(16, top)}px`,
                left: `${Math.max(16, left)}px`,
            });
        }
    }, [coords, contentRef, zoom, comment]);

    const handleReplySubmit = () => {
        if (comment && newReply.trim()) {
            const reply = {
                id: `rep-${Date.now()}`,
                authorId: 'user-1', // Hardcoded admin
                text: newReply,
                timestamp: new Date().toISOString(),
            };
            if (!comment.replies) comment.replies = [];
            comment.replies.push(reply);
            forceUpdate();
            setNewReply('');
        }
    };
    
    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (comment && onUpdate) {
            onUpdate(comment.id, { status: e.target.value as 'Active' | 'Resolved' });
        }
    };
    
    const formatTime = (time: number) => {
        if (isNaN(time)) return '00:00';
        const minutes = Math.floor(time / 60).toString().padStart(2, '0');
        const seconds = Math.floor(time % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    };
    
    const handleTimeSave = () => {
        if (comment && onUpdate) {
            onUpdate(comment.id, { startTime, endTime });
        }
        setIsEditingTime(false);
    }

    const getMember = (id: string) => board_members.find(m => m.id === id);

    const getSafeDateForInput = (isoString?: string) => {
        if (!isoString) return '';
        try {
            // Converts ISO string to local datetime-local input format
            const date = new Date(isoString);
            const tzoffset = (new Date()).getTimezoneOffset() * 60000;
            return (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
        } catch (e) { return ''; }
    };
    
    const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        const newIsoDate = newDate ? new Date(newDate).toISOString() : undefined;
        setDueDate(newIsoDate || '');
        if (comment && onUpdate) {
            onUpdate(comment.id, { dueDate: newIsoDate });
        }
    };

    return (
        <div ref={popoverRef} style={style} className="comment-popover z-20 w-80 bg-glass rounded-xl shadow-2xl border border-border-color flex flex-col" onClick={e => e.stopPropagation()}>
            {comment ? (
                <>
                    <div className="p-4 border-b border-border-color">
                        <div className="flex justify-between items-start">
                             <div>
                                <h4 className="font-bold text-text-primary">Comment #{comment.pin_number}</h4>
                                <p className="text-xs text-text-secondary">by {getMember(comment.reporterId)?.name}</p>
                            </div>
                            <button onClick={onClose} className="text-2xl text-text-secondary hover:text-text-primary">&times;</button>
                        </div>
                    </div>
                     {comment.targetType === 'video' && (
                        <div className="px-4 pt-3 text-sm text-text-secondary flex items-center justify-between">
                            {isEditingTime ? (
                                <div className="flex items-center gap-1">
                                    <input type="number" step="1" value={Math.round(startTime)} onChange={e => setStartTime(parseFloat(e.target.value))} className="w-14 text-center bg-glass-light border border-border-color rounded px-1 py-0.5" />
                                    <span>-</span>
                                    <input type="number" step="1" value={Math.round(endTime)} onChange={e => setEndTime(parseFloat(e.target.value))} className="w-14 text-center bg-glass-light border border-border-color rounded px-1 py-0.5" />
                                </div>
                            ) : (
                                <div>
                                    Time: <span className="font-mono text-text-primary">{formatTime(comment.startTime || 0)} - {formatTime(comment.endTime || 0)}</span>
                                </div>
                            )}
                             {isEditingTime ? 
                                <button onClick={handleTimeSave} className="text-xs font-semibold text-primary hover:underline">Save</button> :
                                <button onClick={() => setIsEditingTime(true)} className="text-xs font-semibold text-primary hover:underline">Edit</button>
                            }
                        </div>
                    )}
                    <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
                        <div className="flex items-start gap-2">
                             <img src={getMember(comment.reporterId)?.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                             <div>
                                 <p className="font-semibold text-sm text-text-primary">{getMember(comment.reporterId)?.name}</p>
                                 <p className="text-sm text-text-primary bg-surface-light p-2 rounded-md mt-1">{comment.comment}</p>
                             </div>
                        </div>
                        {comment.replies?.map(reply => (
                            <div key={reply.id} className="flex items-start gap-2">
                                <img src={getMember(reply.authorId)?.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                                <div>
                                    <p className="font-semibold text-sm text-text-primary">{getMember(reply.authorId)?.name}</p>
                                    <p className="text-sm text-text-primary bg-surface-light p-2 rounded-md mt-1">{reply.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-border-color space-y-3">
                         <div className="flex justify-between items-center">
                            <select value={comment.status} onChange={handleStatusChange} className={`text-xs font-semibold rounded-full px-2 py-1 border-0 focus:ring-0 appearance-none ${comment.status === 'Resolved' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                                <option value="Active">Active</option>
                                <option value="Resolved">Resolved</option>
                            </select>
                             <div className="flex gap-2 text-xs">
                                 {comment.status === 'Active' && <button onClick={() => onResolve?.(comment.id)} className="font-medium text-green-400 hover:underline">Resolve</button>}
                                 <button onClick={() => onDelete?.(comment.id)} className="font-medium text-red-400 hover:underline flex items-center gap-1"><DeleteIcon className="w-3 h-3"/> Delete</button>
                             </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-text-secondary">Due Date</label>
                            <input
                                type="datetime-local"
                                value={getSafeDateForInput(dueDate)}
                                onChange={handleDueDateChange}
                                className="w-full mt-1 bg-glass-light p-2 rounded-md text-sm border-border-color text-text-primary"
                            />
                        </div>
                         <textarea value={newReply} onChange={e => setNewReply(e.target.value)} placeholder="Leave a comment..." rows={2} className="w-full bg-glass-light p-2 rounded-md text-sm border-border-color"></textarea>
                         <button onClick={handleReplySubmit} className="w-full mt-2 px-3 py-1.5 bg-primary text-background text-xs font-bold rounded-lg hover:bg-primary-hover">Add Comment</button>
                    </div>
                </>
            ) : (
                <form onSubmit={(e) => { e.preventDefault(); onSubmit(newReply, { ...(targetType === 'video' ? { startTime, endTime } : {}), dueDate: dueDate || undefined }); }} className="p-4 space-y-3">
                     <h4 className="font-bold text-text-primary text-center">New Comment</h4>
                     
                      {targetType === 'video' && (
                        <div className="flex items-center justify-center gap-2 text-sm">
                            <label className="text-text-secondary">Time:</label>
                            <input type="number" step="1" value={Math.round(startTime)} onChange={e => setStartTime(parseFloat(e.target.value))} className="w-16 text-center bg-glass-light border border-border-color rounded px-1 py-0.5" />
                            <span className="text-text-secondary">-</span>
                            <input type="number" step="1" value={Math.round(endTime)} onChange={e => setEndTime(parseFloat(e.target.value))} className="w-16 text-center bg-glass-light border border-border-color rounded px-1 py-0.5" />
                        </div>
                    )}

                     <textarea autoFocus value={newReply} onChange={e => setNewReply(e.target.value)} placeholder="Add your comment..." rows={4} className="w-full bg-glass-light p-2 rounded-md text-sm border-border-color"></textarea>
                      <div>
                        <label className="text-xs font-medium text-text-secondary">Due Date (Optional)</label>
                        <input
                            type="datetime-local"
                            value={getSafeDateForInput(dueDate)}
                            onChange={handleDueDateChange}
                            className="w-full mt-1 bg-glass-light p-2 rounded-md text-sm border-border-color text-text-primary"
                        />
                    </div>
                     <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-3 py-1 text-xs font-medium rounded bg-glass-light hover:bg-border-color text-text-primary">Cancel</button>
                        <button type="submit" className="px-3 py-1 text-xs font-medium rounded bg-primary hover:bg-primary-hover text-white">Submit</button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default CommentPopover;