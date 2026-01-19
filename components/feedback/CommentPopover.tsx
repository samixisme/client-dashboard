import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';
import { FeedbackComment, User } from '../../types';
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
    users?: User[]; // Optional prop for direct user data injection
}

// Reusable user avatar/name component if needed
const UserInfo = ({ userId, getMember }: { userId: string, getMember: (id: string) => User | undefined }) => {
    const user = getMember(userId);
    return (
        <div className="flex items-center gap-2">
            {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-6 h-6 rounded-full" />
            ) : (
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    {user?.name?.[0] || 'U'}
                </div>
            )}
            <span className="font-semibold text-xs text-text-primary">{user?.name || 'Unknown User'}</span>
        </div>
    );
};

// Thread component
const CommentThread = ({ replies, getMember }: { replies: any[], getMember: (id: string) => any }) => {
    if (!replies || replies.length === 0) return null;
    return (
        <div className="pl-4 border-l border-border-color space-y-3 mt-3">
            {replies.map(reply => (
                <div key={reply.id} className="flex flex-col gap-1">
                    <UserInfo userId={reply.authorId} getMember={getMember} />
                    <p className="text-sm text-text-primary bg-white/5 p-2 rounded-md ml-8">{reply.text}</p>
                    {reply.replies && <CommentThread replies={reply.replies} getMember={getMember} />}
                </div>
            ))}
        </div>
    );
};

const CommentPopover: React.FC<CommentPopoverProps> = ({ comment, coords, contentRef, zoom, onClose, onSubmit, onUpdate, onResolve, onDelete, targetType, videoCurrentTime, users }) => {
    // Gracefully handle context
    let dataContext;
    try {
        dataContext = useData();
    } catch (e) {
        // Context not available
    }
    const data = dataContext?.data;
    const forceUpdate = dataContext?.forceUpdate;

    const board_members = users || data?.board_members || [];
    
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
                replies: [], 
            };
            if (!comment.replies) comment.replies = [];
            comment.replies.push(reply);
            if (forceUpdate) forceUpdate(); // Optimistic update if context exists
            
            // Call onUpdate to persist
            if (onUpdate) {
                onUpdate(comment.id, { replies: comment.replies });
            }

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
        <div 
            ref={popoverRef} 
            style={style} 
            className="comment-popover z-50 w-80 bg-[#1C1C1C] rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-[#27272A] flex flex-col backdrop-blur-md"
            onClick={e => e.stopPropagation()}
        >
            {comment ? (
                <>
                    <div className="px-4 py-3 border-b border-border-color flex justify-between items-center bg-white/5 rounded-t-xl">
                         <div className="flex items-center gap-2">
                             <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-[#0A0A0A] text-xs font-bold">
                                {comment.pin_number}
                             </span>
                             <span className="text-xs text-text-secondary">
                                {new Date(comment.timestamp || Date.now()).toLocaleDateString()}
                             </span>
                        </div>
                        <button onClick={onClose} className="text-text-secondary hover:text-white transition-colors">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
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

                    <div className="p-4 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                        <div className="flex flex-col gap-2">
                             <UserInfo userId={comment.reporterId} getMember={getMember} />
                             <p className="text-sm text-text-primary ml-8">{comment.comment}</p>
                        </div>
                        <CommentThread replies={comment.replies || []} getMember={getMember} />
                    </div>

                    <div className="p-4 border-t border-border-color space-y-3 bg-white/5 rounded-b-xl">
                         <div className="flex justify-between items-center">
                            <select 
                                value={comment.status} 
                                onChange={handleStatusChange} 
                                className={`text-xs font-semibold rounded-lg px-2 py-1 border-0 focus:ring-0 appearance-none cursor-pointer transition-colors ${comment.status === 'Resolved' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'}`}
                            >
                                <option value="Active">Active</option>
                                <option value="Resolved">Resolved</option>
                            </select>
                             <div className="flex gap-3 text-xs">
                                 {comment.status === 'Active' && <button onClick={() => onResolve?.(comment.id)} className="font-medium text-green-400 hover:text-green-300 transition-colors">Resolve</button>}
                                 <button onClick={() => onDelete?.(comment.id)} className="font-medium text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"><DeleteIcon className="w-3 h-3"/> Delete</button>
                             </div>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase tracking-wider font-bold text-text-secondary">Due Date</label>
                            <input
                                type="datetime-local"
                                value={getSafeDateForInput(dueDate)}
                                onChange={handleDueDateChange}
                                className="w-full bg-[#0A0A0A] p-2 rounded-lg text-xs border border-border-color text-text-primary focus:border-primary focus:outline-none transition-colors"
                            />
                        </div>

                        <div className="relative">
                            <textarea 
                                value={newReply} 
                                onChange={e => setNewReply(e.target.value)} 
                                placeholder="Write a reply..." 
                                rows={2} 
                                className="w-full bg-[#0A0A0A] p-3 pr-10 rounded-lg text-sm border border-border-color text-text-primary focus:border-primary focus:outline-none resize-none transition-colors placeholder:text-text-secondary/50"
                            />
                            <button 
                                onClick={handleReplySubmit} 
                                disabled={!newReply.trim()}
                                className="absolute bottom-2 right-2 p-1.5 bg-primary text-black rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-hover transition-colors"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <form onSubmit={(e) => { e.preventDefault(); onSubmit(newReply, { ...(targetType === 'video' ? { startTime, endTime } : {}), dueDate: dueDate || undefined }); }} className="p-4 space-y-4">
                     <h4 className="font-bold text-text-primary text-center">New Comment</h4>
                     
                      {targetType === 'video' && (
                        <div className="flex items-center justify-center gap-2 text-sm">
                            <label className="text-text-secondary">Time:</label>
                            <input type="number" step="1" value={Math.round(startTime)} onChange={e => setStartTime(parseFloat(e.target.value))} className="w-16 text-center bg-glass-light border border-border-color rounded px-1 py-0.5" />
                            <span className="text-text-secondary">-</span>
                            <input type="number" step="1" value={Math.round(endTime)} onChange={e => setEndTime(parseFloat(e.target.value))} className="w-16 text-center bg-glass-light border border-border-color rounded px-1 py-0.5" />
                        </div>
                    )}

                     <textarea 
                        autoFocus 
                        value={newReply} 
                        onChange={e => setNewReply(e.target.value)} 
                        placeholder="What's on your mind?" 
                        rows={4} 
                        className="w-full bg-[#0A0A0A] p-3 rounded-lg text-sm border border-border-color text-text-primary focus:border-primary focus:outline-none resize-none placeholder:text-text-secondary/50"
                    ></textarea>
                      
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-text-secondary">Due Date (Optional)</label>
                        <input
                            type="datetime-local"
                            value={getSafeDateForInput(dueDate)}
                            onChange={handleDueDateChange}
                            className="w-full bg-[#0A0A0A] p-2 rounded-lg text-xs border border-border-color text-text-primary focus:border-primary focus:outline-none"
                        />
                    </div>

                     <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold rounded-lg bg-white/5 hover:bg-white/10 text-text-primary transition-colors">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-xs font-bold rounded-lg bg-primary hover:bg-primary-hover text-black transition-colors">Post Comment</button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default CommentPopover;