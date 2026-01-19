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
    const board_members = users || [];
    
    const [newReply, setNewReply] = useState('');
    const popoverRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 }); // Start invisible to prevent flash
    
    const [startTime, setStartTime] = useState(comment?.startTime ?? videoCurrentTime ?? 0);
    const [endTime, setEndTime] = useState(comment?.endTime ?? (videoCurrentTime ? videoCurrentTime + 5 : 5));
    const [isEditingTime, setIsEditingTime] = useState(false);
    const [dueDate, setDueDate] = useState(comment?.dueDate || '');

    useEffect(() => {
        setDueDate(comment?.dueDate || '');
    }, [comment]);


    const textareaRef = useRef<HTMLTextAreaElement>(null);

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

            // Focus textarea after positioning to prevent scroll jump
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
                authorId: 'user-1', // Hardcoded admin
                text: newReply,
                timestamp: new Date().toISOString(),
                replies: [], 
            };
            if (!comment.replies) comment.replies = [];
            comment.replies.push(reply);
            
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
            style={{
                ...style,
                backgroundColor: '#1C1C1C',
                color: '#F4F4F5',
                borderColor: '#27272A'
            }}
            className="comment-popover z-50 w-72 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] border flex flex-col backdrop-blur-md"
            onClick={e => e.stopPropagation()}
        >
            {comment ? (
                <>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: '#27272A' }} className="px-3 py-2 border-b flex justify-between items-center rounded-t-xl">
                         <div className="flex items-center gap-2">
                             <span style={{ backgroundColor: '#A3E635', color: '#000000' }} className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold">
                                {comment.pin_number}
                             </span>
                             <span className="text-[10px] text-text-secondary">
                                {new Date(comment.timestamp || Date.now()).toLocaleDateString()}
                             </span>
                        </div>
                        <button onClick={onClose} className="text-text-secondary hover:text-white transition-colors">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                     {comment.targetType === 'video' && (
                        <div className="px-3 pt-2 text-xs text-text-secondary flex items-center justify-between">
                            {/* ... video controls ... */}
                            {isEditingTime ? (
                                <div className="flex items-center gap-1">
                                    <input type="number" value={Math.round(startTime)} onChange={e => setStartTime(parseFloat(e.target.value))} className="w-10 text-center bg-glass-light border border-border-color rounded px-1 py-0.5 text-[10px]" />
                                    <span>-</span>
                                    <input type="number" value={Math.round(endTime)} onChange={e => setEndTime(parseFloat(e.target.value))} className="w-10 text-center bg-glass-light border border-border-color rounded px-1 py-0.5 text-[10px]" />
                                </div>
                            ) : (
                                <div>
                                    Time: <span className="font-mono text-text-primary">{formatTime(comment.startTime || 0)} - {formatTime(comment.endTime || 0)}</span>
                                </div>
                            )}
                             {isEditingTime ? 
                                <button onClick={handleTimeSave} className="text-[10px] font-bold text-primary hover:underline">Save</button> :
                                <button onClick={() => setIsEditingTime(true)} className="text-[10px] font-bold text-primary hover:underline">Edit</button>
                            }
                        </div>
                    )}

                    <div className="p-3 space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar">
                        <div className="flex flex-col gap-1.5">
                             <UserInfo userId={comment.reporterId} getMember={getMember} />
                             <p style={{ color: '#F4F4F5' }} className="text-xs ml-8">{comment.comment}</p>
                        </div>
                        <CommentThread replies={comment.replies || []} getMember={getMember} />
                    </div>

                    <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: '#27272A' }} className="p-3 border-t space-y-3 rounded-b-xl">
                         <div className="flex justify-between items-center">
                            {/* Status Switch */}
                            <div 
                                className="relative flex items-center bg-black/50 rounded-full p-0.5 border border-white/10 w-24 h-6 cursor-pointer"
                                onClick={() => onResolve?.(comment.id)}
                            >
                                <div 
                                    className={`absolute top-0.5 bottom-0.5 w-11 rounded-full transition-all duration-300 shadow-sm ${comment.status === 'Resolved' ? 'left-[calc(100%-1.375rem-2px)] bg-green-500' : 'left-0.5 bg-yellow-500'}`}
                                />
                                <span className={`relative z-10 w-1/2 text-center text-[9px] font-bold transition-colors ${comment.status !== 'Resolved' ? 'text-black' : 'text-text-secondary'}`}>Active</span>
                                <span className={`relative z-10 w-1/2 text-center text-[9px] font-bold transition-colors ${comment.status === 'Resolved' ? 'text-black' : 'text-text-secondary'}`}>Resolved</span>
                            </div>

                             <div className="flex gap-2 items-center">
                                 <button onClick={() => onDelete?.(comment.id)} className="p-1 rounded-md text-red-400 hover:text-red-300 transition-colors" title="Delete Comment">
                                    <DeleteIcon className="w-3.5 h-3.5"/>
                                 </button>
                             </div>
                        </div>
                        
                        {/* Page URL Display */}
                        {(comment as any).pageUrl && (
                            <div className="text-[10px] text-text-secondary truncate flex items-center gap-1 bg-white/5 p-1 rounded">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                <span className="truncate">{(comment as any).pageUrl}</span>
                            </div>
                        )}
                        
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] uppercase tracking-wider font-bold text-text-secondary">Due Date</label>
                            <input
                                type="datetime-local"
                                value={getSafeDateForInput(dueDate)}
                                onChange={handleDueDateChange}
                                style={{ backgroundColor: '#0A0A0A', color: '#F4F4F5', borderColor: '#27272A' }}
                                className="w-full p-1.5 rounded-lg text-[10px] border focus:outline-none transition-colors"
                            />
                        </div>

                        <div className="relative">
                            <textarea 
                                value={newReply} 
                                onChange={e => setNewReply(e.target.value)} 
                                placeholder="Write a comment..." 
                                rows={1} 
                                style={{ backgroundColor: '#0A0A0A', color: '#F4F4F5', borderColor: '#27272A' }}
                                className="w-full p-2 pr-8 rounded-lg text-xs border focus:outline-none resize-none transition-colors placeholder:text-text-secondary/50"
                            />
                            <button 
                                onClick={handleReplySubmit} 
                                disabled={!newReply.trim()}
                                style={{ backgroundColor: '#A3E635', color: '#000000' }}
                                className="absolute bottom-1.5 right-1.5 p-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-colors"
                            >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <form onSubmit={(e) => { e.preventDefault(); onSubmit(newReply, { ...(targetType === 'video' ? { startTime, endTime } : {}), dueDate: dueDate || undefined }); }} className="p-3 space-y-3">
                     <h4 className="font-bold text-text-primary text-center text-sm">New Comment</h4>
                     
                      {targetType === 'video' && (
                        // ... video inputs ...
                        <div className="flex items-center justify-center gap-2 text-xs">
                            <label className="text-text-secondary">Time:</label>
                            <input type="number" step="1" value={Math.round(startTime)} onChange={e => setStartTime(parseFloat(e.target.value))} className="w-12 text-center bg-glass-light border border-border-color rounded px-1 py-0.5" />
                            <span className="text-text-secondary">-</span>
                            <input type="number" step="1" value={Math.round(endTime)} onChange={e => setEndTime(parseFloat(e.target.value))} className="w-12 text-center bg-glass-light border border-border-color rounded px-1 py-0.5" />
                        </div>
                    )}

                     <textarea 
                        ref={textareaRef}
                        value={newReply} 
                        onChange={e => setNewReply(e.target.value)} 
                        placeholder="Write a comment..." 
                        rows={3} 
                        style={{ backgroundColor: '#0A0A0A', color: '#F4F4F5', borderColor: '#27272A' }}
                        className="w-full p-2 rounded-lg text-xs border focus:outline-none resize-none placeholder:text-text-secondary/50"
                    ></textarea>
                      
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-text-secondary">Due Date (Optional)</label>
                        <input
                            type="datetime-local"
                            value={getSafeDateForInput(dueDate)}
                            onChange={handleDueDateChange}
                            style={{ backgroundColor: '#0A0A0A', color: '#F4F4F5', borderColor: '#27272A' }}
                            className="w-full p-1.5 rounded-lg text-[10px] border focus:outline-none"
                        />
                    </div>

                     <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={onClose} style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#F4F4F5' }} className="px-2 py-1 text-[10px] font-bold rounded-md hover:bg-white/20 transition-colors">Cancel</button>
                        <button type="submit" style={{ backgroundColor: '#A3E635', color: '#000000' }} className="px-2 py-1 text-[10px] font-bold rounded-md hover:opacity-90 transition-colors">Post</button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default CommentPopover;