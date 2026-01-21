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
    currentUserId?: string;
}

// Styles for reusable components
const sharedStyles = {
    userInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    avatar: {
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        objectFit: 'cover' as const,
        flexShrink: 0
    },
    avatarPlaceholder: {
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        backgroundColor: 'rgba(163, 230, 53, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        fontWeight: 'bold',
        color: '#A3E635',
        flexShrink: 0
    },
    userName: {
        fontSize: '11px', 
        fontWeight: 600,
        color: '#F4F4F5'
    },
    threadContainer: {
        paddingLeft: '16px',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '12px',
        marginTop: '12px'
    },
    replyItem: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '4px'
    },
    replyHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    deleteBtn: {
        fontSize: '10px',
        color: '#F87171',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '2px 4px',
        opacity: 0.8
    },
    replyText: {
        fontSize: '11px',
        color: '#F4F4F5',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: '8px',
        borderRadius: '6px',
        marginLeft: '32px',
        marginTop: '0px',
        lineHeight: 1.4
    }
};

export const UserInfo = ({ userId, getMember }: { userId: string, getMember: (id: string) => User | undefined }) => {
    const user = getMember(userId);
    return (
        <div style={sharedStyles.userInfo}>
            {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} style={sharedStyles.avatar} />
            ) : (
                <div style={sharedStyles.avatarPlaceholder}>
                    {user?.name?.[0] || 'U'}
                </div>
            )}
            <span style={sharedStyles.userName}>{user?.name || 'Unknown User'}</span>
        </div>
    );
};

export const CommentThread = ({ replies, getMember, currentUserId, onDelete }: { replies: any[], getMember: (id: string) => any, currentUserId?: string, onDelete: (id: string) => void }) => {
    if (!replies || replies.length === 0) return null;
    return (
        <div style={sharedStyles.threadContainer}>
            {replies.map(reply => (
                    <div key={reply.id} style={sharedStyles.replyItem}>
                        <div style={sharedStyles.replyHeader}>
                            <UserInfo userId={reply.authorId} getMember={getMember} />
                            {currentUserId === reply.authorId && (
                                <button onClick={() => onDelete(reply.id)} style={sharedStyles.deleteBtn}>Delete</button>
                            )}
                        </div>
                        <p style={sharedStyles.replyText}>{reply.text}</p>
                        {reply.replies && <CommentThread replies={reply.replies} getMember={getMember} currentUserId={currentUserId} onDelete={onDelete} />}
                    </div>
            ))}
        </div>
    );
};

const CommentPopover: React.FC<CommentPopoverProps> = ({ comment, coords, contentRef, zoom, onClose, onSubmit, onUpdate, onResolve, onDelete, targetType, videoCurrentTime, users, currentUserId }) => {
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

    const [isEditingComment, setIsEditingComment] = useState(false);
    const [editCommentText, setEditCommentText] = useState(comment?.comment || '');


    useEffect(() => {
        setDueDate(comment?.dueDate || '');
    }, [comment?.dueDate]);

    useEffect(() => {
        if (comment) {
            setLocalStatus(comment.status || 'Active');
        }
    }, [comment?.status]);

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
                authorId: currentUserId || 'guest-user',
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

    const handleCommentEditSave = () => {
        if (comment && onUpdate && editCommentText.trim()) {
            onUpdate(comment.id, { comment: editCommentText });
            setIsEditingComment(false);
        }
    };

    const handleReplyDelete = (replyId: string) => {
        if (!comment || !onUpdate) return;
        
        const deleteRecursively = (replies: any[]): any[] => {
            return replies.filter(r => r.id !== replyId).map(r => ({
                ...r,
                replies: r.replies ? deleteRecursively(r.replies) : []
            }));
        };

        const newReplies = deleteRecursively(comment.replies || []);
        onUpdate(comment.id, { replies: newReplies });
    };

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

    // Inline styles to prevent CSS bleed from proxied websites
    const styles = {
        container: {
            width: '288px',
            borderRadius: '12px',
            boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.7)',
            backgroundColor: 'rgba(28, 28, 28, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column' as const,
            color: '#F4F4F5',
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            zIndex: 9999,
        },
        header: {
            padding: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
        },
        title: {
            fontSize: '14px',
            fontWeight: 600,
            color: '#A3E635',
            margin: 0,
            lineHeight: 1.4,
        },
        subtitle: {
            fontSize: '11px',
            color: '#A1A1AA',
            margin: 0,
        },
        closeBtn: {
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: '#272727',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#A1A1AA',
            cursor: 'pointer',
            padding: 0,
        },
        section: {
            padding: '0 12px 12px 12px',
        },
        avatar: {
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: '#A3E635',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 700,
            color: '#0A0A0A',
            flexShrink: 0,
        },
        name: {
            fontSize: '11px',
            fontWeight: 600,
            color: '#F4F4F5',
            margin: 0,
        },
        commentText: {
            fontSize: '11px',
            color: '#F4F4F5',
            margin: '4px 0 0 0',
        },
        actionsRow: {
            padding: '0 12px 12px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap' as const,
        },
        badge: {
            padding: '2px 8px',
            borderRadius: '9999px',
            fontSize: '10px',
            fontWeight: 700,
            border: '1px solid #A3E635',
            color: '#A3E635',
            backgroundColor: 'transparent',
        },
        actionBtn: {
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 500,
            backgroundColor: '#272727',
            color: '#A3E635',
            border: 'none',
            cursor: 'pointer',
        },
        deleteBtn: {
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 500,
            backgroundColor: '#272727',
            color: '#F87171',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
        },
        label: {
            fontSize: '11px',
            color: '#A1A1AA',
            marginBottom: '4px',
            display: 'block',
        },
        input: {
            width: '100%',
            padding: '6px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            backgroundColor: 'rgba(39, 39, 39, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#F4F4F5',
            outline: 'none',
            boxSizing: 'border-box' as const,
            colorScheme: 'dark',
            accentColor: '#A3E635',
        },
        textarea: {
            width: '100%',
            padding: '6px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            backgroundColor: 'rgba(39, 39, 39, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#F4F4F5',
            outline: 'none',
            resize: 'none' as const,
            boxSizing: 'border-box' as const,
            fontFamily: 'Inter, sans-serif',
        },
        toggleContainer: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
        },
        toggleTrack: {
            width: '36px',
            height: '20px',
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            position: 'relative' as const,
        },
        toggleThumb: {
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            position: 'absolute' as const,
            top: '2px',
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        },
        submitBtn: {
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: '#A3E635',
            color: '#0A0A0A',
            border: 'none',
            cursor: 'pointer',
        },
        submitBtnDisabled: {
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: '#A3E635',
            color: '#0A0A0A',
            border: 'none',
            opacity: 0.5,
            cursor: 'not-allowed',
        },
    };

    return (
        <div 
            ref={popoverRef} 
            style={{...styles.container, ...style}}
            onClick={e => e.stopPropagation()}
            className="comment-popover"
        >
            <style>{`
                .comment-popover textarea::placeholder {
                    color: #A1A1AA !important;
                }
                .comment-popover input[type="datetime-local"] {
                    color-scheme: dark;
                }
                .comment-popover input[type="datetime-local"]::-webkit-calendar-picker-indicator {
                    filter: invert(1) !important;
                    opacity: 0.7;
                    cursor: pointer;
                }
                .comment-popover input[type="datetime-local"]::-webkit-calendar-picker-indicator:hover {
                    opacity: 1;
                }
            `}</style>
            {comment ? (
                <>
                    {/* Header */}
                    <div style={styles.header}>
                        <div>
                            <h3 style={styles.title}>Comment #{comment.pin_number}</h3>
                            <p style={styles.subtitle}>by {getMember(comment.reporterId)?.name || 'Unknown'}</p>
                        </div>
                        <button onClick={onClose} style={styles.closeBtn}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                    {/* Video Time */}
                    {comment.targetType === 'video' && (
                        <div style={{...styles.section, fontSize: '11px', color: '#A1A1AA', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            {isEditingTime ? (
                                <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                                    <input type="number" value={Math.round(startTime)} onChange={e => setStartTime(parseFloat(e.target.value))} style={{...styles.input, width: '40px', textAlign: 'center'}} />
                                    <span>-</span>
                                    <input type="number" value={Math.round(endTime)} onChange={e => setEndTime(parseFloat(e.target.value))} style={{...styles.input, width: '40px', textAlign: 'center'}} />
                                </div>
                            ) : (
                                <div>Time: <span style={{color: '#F4F4F5', fontFamily: 'monospace'}}>{formatTime(comment.startTime || 0)} - {formatTime(comment.endTime || 0)}</span></div>
                            )}
                            <button onClick={isEditingTime ? handleTimeSave : () => setIsEditingTime(true)} style={{background: 'none', border: 'none', color: '#A3E635', fontSize: '11px', cursor: 'pointer'}}>
                                {isEditingTime ? 'Save' : 'Edit'}
                            </button>
                        </div>
                    )}

                    {/* Comment Content */}
                    <div style={styles.section}>
                        <div style={{display: 'flex', alignItems: 'flex-start', gap: '8px'}}>
                            {getMember(comment.reporterId)?.avatarUrl ? (
                                <img src={getMember(comment.reporterId)?.avatarUrl} alt="" style={{...styles.avatar, backgroundColor: 'transparent'}} />
                            ) : (
                                <div style={styles.avatar}>
                                    {getMember(comment.reporterId)?.name?.[0] || 'U'}
                                </div>
                            )}
                            <div style={{flex: 1}}>
                                <p style={styles.name}>{getMember(comment.reporterId)?.name || 'Unknown User'}</p>
                                {isEditingComment ? (
                                    <div className="mt-1">
                                        <textarea 
                                            value={editCommentText}
                                            onChange={e => setEditCommentText(e.target.value)}
                                            style={{...styles.textarea, marginBottom: '6px'}}
                                            rows={2}
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setIsEditingComment(false)} style={{...styles.actionBtn, backgroundColor: '#3F3F46', color: '#F4F4F5'}}>Cancel</button>
                                            <button onClick={handleCommentEditSave} style={styles.actionBtn}>Save</button>
                                        </div>
                                    </div>
                                ) : (
                                    <p style={styles.commentText}>{comment.comment}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                         <div style={styles.section}>
                             <h4 style={{...styles.subtitle, marginTop: '8px'}}>Replies</h4>
                             <CommentThread replies={comment.replies} getMember={getMember} currentUserId={currentUserId} onDelete={handleReplyDelete} />
                         </div>
                    )}

                    {/* Status Toggle */}
                    <div style={{...styles.section, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                        <div style={styles.toggleContainer}>
                            <span style={{fontSize: '11px', color: localStatus === 'Active' ? '#A3E635' : '#22C55E', fontWeight: 600}}>
                                {localStatus}
                            </span>
                            <div 
                                onClick={() => {
                                    const newStatus = localStatus === 'Active' ? 'Resolved' : 'Active';
                                    setLocalStatus(newStatus);
                                    onResolve?.(comment.id);
                                }}
                                style={{
                                    ...styles.toggleTrack,
                                    backgroundColor: localStatus === 'Resolved' ? '#22C55E' : '#3F3F46',
                                }}
                            >
                                <div style={{
                                    ...styles.toggleThumb,
                                    left: localStatus === 'Resolved' ? '18px' : '2px',
                                }} />
                            </div>
                        </div>
                        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                            <button 
                                onClick={() => { setEditCommentText(comment.comment); setIsEditingComment(true); }} 
                                style={{
                                    ...styles.actionBtn, 
                                    backgroundColor: '#272727', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '4px'
                                }}
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                Edit
                            </button>
                            <button onClick={() => onDelete?.(comment.id)} style={styles.deleteBtn}>
                                <DeleteIcon style={{width: '12px', height: '12px'}}/> Delete
                            </button>
                        </div>
                    </div>

                    {/* Due Date */}
                    <div style={styles.section}>
                        <label style={styles.label}>Due Date</label>
                        <input
                            type="datetime-local"
                            value={getSafeDateForInput(dueDate)}
                            onChange={handleDueDateChange}
                            style={styles.input}
                        />
                    </div>

                    {/* Reply Input */}
                    <div style={styles.section}>
                        <textarea 
                            value={newReply} 
                            onChange={e => setNewReply(e.target.value)} 
                            placeholder="Leave a comment..." 
                            rows={2} 
                            style={styles.textarea}
                        />
                    </div>

                    {/* Submit Button */}
                    <div style={styles.section}>
                        <button
                            onClick={handleReplySubmit}
                            disabled={!newReply.trim()}
                            style={newReply.trim() ? styles.submitBtn : styles.submitBtnDisabled}
                        >
                            Add Comment
                        </button>
                    </div>
                </>
            ) : (
                <div>
                    {/* Header */}
                    <div style={styles.header}>
                        <h3 style={styles.title}>New Comment</h3>
                        <button type="button" onClick={onClose} style={styles.closeBtn}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); onSubmit(newReply, { ...(targetType === 'video' ? { startTime, endTime } : {}), dueDate: dueDate || undefined }); }}>
                        {/* Video Time */}
                        {targetType === 'video' && (
                            <div style={{...styles.section, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px'}}>
                                <span style={{color: '#A1A1AA'}}>Time:</span>
                                <input type="number" value={Math.round(startTime)} onChange={e => setStartTime(parseFloat(e.target.value))} style={{...styles.input, width: '40px', textAlign: 'center'}} />
                                <span style={{color: '#A1A1AA'}}>-</span>
                                <input type="number" value={Math.round(endTime)} onChange={e => setEndTime(parseFloat(e.target.value))} style={{...styles.input, width: '40px', textAlign: 'center'}} />
                            </div>
                        )}

                        {/* Comment Input */}
                        <div style={styles.section}>
                            <textarea 
                                ref={textareaRef}
                                value={newReply} 
                                onChange={e => setNewReply(e.target.value)} 
                                placeholder="Leave a comment..." 
                                rows={2} 
                                style={styles.textarea}
                            />
                        </div>
                        
                        {/* Due Date */}
                        <div style={styles.section}>
                            <label style={styles.label}>Due Date</label>
                            <input
                                type="datetime-local"
                                value={getSafeDateForInput(dueDate)}
                                onChange={handleDueDateChange}
                                style={styles.input}
                            />
                        </div>

                        {/* Submit Button */}
                        <div style={styles.section}>
                            <button 
                                type="submit" 
                                disabled={!newReply.trim()}
                                style={newReply.trim() ? styles.submitBtn : styles.submitBtnDisabled}
                            >
                                Add Comment
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default CommentPopover;


