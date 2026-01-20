import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';
import { FeedbackComment, User } from '../../types';
import { useData } from '../../contexts/DataContext';
import { DeleteIcon } from '../icons/DeleteIcon';
import { CalendarIcon } from '../icons/CalendarIcon';

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

const UserInfo = ({ userId, getMember }: { userId: string, getMember: (id: string) => User | undefined }) => {
    const user = getMember(userId);
    return (
        <div className="flex items-center gap-2">
            {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-6 h-6 rounded-full" />
            ) : (
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {user?.name?.[0] || 'U'}
                </div>
            )}
            <span className="font-semibold text-xs text-text-primary">{user?.name || 'Unknown User'}</span>
        </div>
    );
};

const CommentThread = ({ replies, getMember }: { replies: any[], getMember: (id: string) => any }) => {
    if (!replies || replies.length === 0) return null;
    return (
        <div className="pl-4 border-l border-border-color space-y-3 mt-3">
            {replies.map(reply => (
                <div key={reply.id} className="flex flex-col gap-1">
                    <UserInfo userId={reply.authorId} getMember={getMember} />
                    <p className="text-sm text-text-primary bg-glass-light p-2 rounded-md ml-8">{reply.text}</p>
                    {reply.replies && <CommentThread replies={reply.replies} getMember={getMember} />}
                </div>
            ))}
        </div>
    );
};

const CommentPopover: React.FC<CommentPopoverProps> = ({ comment, coords, contentRef, zoom, onClose, onSubmit, onUpdate, onResolve, onDelete, targetType, videoCurrentTime, users }) => {
    const board_members = users || [];
    
    const [newReply, setNewReply] = useState('');
    const popoverRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 });
    
    const [startTime, setStartTime] = useState(comment?.startTime ?? videoCurrentTime ?? 0);
    const [endTime, setEndTime] = useState(comment?.endTime ?? (videoCurrentTime ? videoCurrentTime + 5 : 5));
    const [isEditingTime, setIsEditingTime] = useState(false);
    const [dueDate, setDueDate] = useState(comment?.dueDate || '');
    const [localStatus, setLocalStatus] = useState<'Active' | 'Resolved'>(comment?.status || 'Active');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setDueDate(comment?.dueDate || '');
        if (comment) {
            setLocalStatus(comment.status || 'Active');
        }
    }, [comment]);

    useLayoutEffect(() => {
        if (!contentRef.current || !popoverRef.current) return;
            
        try {
            const popoverRect = popoverRef.current.getBoundingClientRect();
            let top = 0, left = 0;

            if (coords && typeof coords.x === 'number' && typeof coords.y === 'number') { 
                top = coords.y * zoom + 20; 
                left = coords.x * zoom;
                
                if (window.innerWidth - (left - window.scrollX) < 350) { 
                    left = Math.max(0, coords.x * zoom - 320); 
                }
            } else { 
                 top = window.scrollY + window.innerHeight / 2 - popoverRect.height / 2;
                 left = window.scrollX + window.innerWidth / 2 - popoverRect.width / 2;
            }

            setStyle({
                position: 'absolute',
                top: `${Math.max(0, top)}px`,
                left: `${Math.max(0, left)}px`,
                opacity: 1
            });

            if (!comment && textareaRef.current) {
                setTimeout(() => {
                    textareaRef.current?.focus({ preventScroll: true });
                }, 50);
            }

        } catch (e) {
            console.error("Error positioning popover:", e);
            setStyle({
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: 1
            });
        }
    }, [coords, contentRef, zoom, comment?.id]);

    const handleReplySubmit = () => {
        if (comment && newReply.trim()) {
            const reply = {
                id: `rep-${Date.now()}`,
                authorId: 'user-1',
                text: newReply,
                timestamp: new Date().toISOString(),
                replies: [], 
            };
            if (!comment.replies) comment.replies = [];
            comment.replies.push(reply);
            
            if (onUpdate) {
                onUpdate(comment.id, { replies: comment.replies });
            }
            setNewReply('');
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
            className="comment-popover z-50 w-80 rounded-lg shadow-lg bg-surface/80 border border-border-color flex flex-col backdrop-blur-md text-text-primary"
            onClick={e => e.stopPropagation()}
        >
            {comment ? (
                <>
                    <div className="px-4 py-2 border-b border-border-color flex justify-between items-center rounded-t-lg bg-surface/50">
                         <div className="flex items-center gap-2">
                             <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-primary text-black">
                                {comment.pin_number}
                             </span>
                             <span className="text-xs text-text-secondary">
                                {new Date(comment.timestamp || Date.now()).toLocaleDateString()}
                             </span>
                        </div>
                        <button onClick={onClose} className="p-1 text-primary hover:text-primary-hover transition-colors">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                     {comment.targetType === 'video' && (
                        <div className="px-4 pt-3 text-sm text-text-secondary flex items-center justify-between">
                            {isEditingTime ? (
                                <div className="flex items-center gap-2">
                                    <input type="number" value={Math.round(startTime)} onChange={e => setStartTime(parseFloat(e.target.value))} className="w-14 text-center bg-surface-light border border-border-color rounded px-2 py-1 text-xs" />
                                    <span>-</span>
                                    <input type="number" value={Math.round(endTime)} onChange={e => setEndTime(parseFloat(e.target.value))} className="w-14 text-center bg-surface-light border border-border-color rounded px-2 py-1 text-xs" />
                                </div>
                            ) : (
                                <div>
                                    Time: <span className="font-mono text-white">{formatTime(comment.startTime || 0)} - {formatTime(comment.endTime || 0)}</span>
                                </div>
                            )}
                             {isEditingTime ? 
                                <button onClick={handleTimeSave} className="text-xs font-bold text-primary hover:underline">Save</button> :
                                <button onClick={() => setIsEditingTime(true)} className="text-xs font-bold text-primary hover:underline">Edit</button>
                            }
                        </div>
                    )}

                    <div className="p-4 space-y-4 max-h-64 overflow-y-auto custom-scrollbar">
                        <div className="flex flex-col gap-2">
                             <UserInfo userId={comment.reporterId} getMember={getMember} />
                             <p className="text-sm ml-8 text-text-primary">{comment.comment}</p>
                        </div>
                        <CommentThread replies={comment.replies || []} getMember={getMember} />
                    </div>

                    <div className="p-4 border-t border-border-color space-y-4 rounded-b-lg bg-surface/50">
                         <div className="flex justify-between items-center">
                            <div 
                                className="relative flex items-center bg-surface-light rounded-full p-1 border border-border-color w-28 h-8 cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const newStatus = localStatus === 'Active' ? 'Resolved' : 'Active';
                                    setLocalStatus(newStatus);
                                    onResolve?.(comment.id);
                                }}
                            >
                                <div 
                                    className={`absolute top-1 bottom-1 w-12 rounded-full transition-all duration-300 shadow-md ${localStatus === 'Resolved' ? 'left-14 bg-green-500' : 'left-1 bg-yellow-500'}`}
                                />
                                <span className={`relative z-10 w-1/2 text-center text-xs font-bold transition-colors ${localStatus !== 'Resolved' ? 'text-black' : 'text-text-secondary'}`}>Active</span>
                                <span className={`relative z-10 w-1/2 text-center text-xs font-bold transition-colors ${localStatus === 'Resolved' ? 'text-black' : 'text-text-secondary'}`}>Resolved</span>
                            </div>

                             <div className="flex gap-2 items-center">
                                 <button onClick={() => onDelete?.(comment.id)} className="p-1 text-primary hover:text-primary-hover transition-colors" title="Delete Comment">
                                    <DeleteIcon className="w-4 h-4"/>
                                 </button>
                             </div>
                        </div>
                        
                        {(comment as any).pageUrl && (
                            <div className="text-xs text-text-secondary truncate flex items-center gap-2 bg-surface-light p-2 rounded-md">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                <span className="truncate">{(comment as any).pageUrl}</span>
                            </div>
                        )}
                        
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-text-secondary">Due Date</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary">
                                    <CalendarIcon className="w-4 h-4" />
                                </div>
                                <input
                                    type="datetime-local"
                                    value={getSafeDateForInput(dueDate)}
                                    onChange={handleDueDateChange}
                                    className="w-full pl-9 p-2 rounded-md text-xs bg-surface-light border border-border-color focus:outline-none focus:ring-2 focus:ring-primary transition-colors text-text-primary"
                                />
                                {dueDate && (
                                    <button 
                                        onClick={() => { setDueDate(''); if(comment && onUpdate) onUpdate(comment.id, { dueDate: undefined }); }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-text-secondary">Add a comment</label>
                            <div className="relative">
                                <textarea 
                                    value={newReply} 
                                    onChange={e => setNewReply(e.target.value)} 
                                    placeholder="Write a comment..." 
                                    rows={2} 
                                    className="w-full p-2 pr-10 rounded-md text-sm bg-surface-light border border-border-color focus:outline-none focus:ring-2 focus:ring-primary resize-none transition-colors placeholder:text-text-secondary text-text-primary"
                                />
                                <button
                                    onClick={handleReplySubmit}
                                    disabled={!newReply.trim()}
                                    className="absolute top-1/2 right-2 -translate-y-1/2 p-1.5 rounded-full text-primary hover:bg-surface-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <form onSubmit={(e) => { e.preventDefault(); onSubmit(newReply, { ...(targetType === 'video' ? { startTime, endTime } : {}), dueDate: dueDate || undefined }); }} className="p-4 space-y-4">
                     <h4 className="font-bold text-white text-center text-lg">New Comment</h4>
                     
                      {targetType === 'video' && (
                        <div className="flex items-center justify-center gap-2 text-sm">
                            <label className="text-text-secondary">Time:</label>
                            <input type="number" step="1" value={Math.round(startTime)} onChange={e => setStartTime(parseFloat(e.target.value))} className="w-16 text-center bg-surface-light border border-border-color rounded-md px-2 py-1 text-text-primary" />
                            <span className="text-text-secondary">-</span>
                            <input type="number" step="1" value={Math.round(endTime)} onChange={e => setEndTime(parseFloat(e.target.value))} className="w-16 text-center bg-surface-light border border-border-color rounded-md px-2 py-1 text-text-primary" />
                        </div>
                    )}

                     <textarea 
                        ref={textareaRef}
                        value={newReply} 
                        onChange={e => setNewReply(e.target.value)} 
                        placeholder="Write a comment..." 
                        rows={4} 
                        className="w-full p-2 rounded-md text-sm bg-surface-light border border-border-color focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-text-secondary text-text-primary"
                    ></textarea>
                      
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-text-secondary">Due Date (Optional)</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary">
                                <CalendarIcon className="w-4 h-4" />
                            </div>
                            <input
                                type="datetime-local"
                                value={getSafeDateForInput(dueDate)}
                                onChange={handleDueDateChange}
                                className="w-full pl-9 p-2 rounded-md text-xs bg-surface-light border border-border-color focus:outline-none focus:ring-2 focus:ring-primary transition-colors text-text-primary"
                            />
                            {dueDate && (
                                <button 
                                    type="button"
                                    onClick={() => setDueDate('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            )}
                        </div>
                    </div>

                     <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold rounded-md bg-surface-light hover:bg-surface transition-colors text-text-primary">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-bold rounded-md bg-primary text-black hover:bg-primary-hover transition-colors">Post</button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default CommentPopover;
