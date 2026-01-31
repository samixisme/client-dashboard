import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FeedbackItemComment } from '../../types';

interface VideoFeedbackTimelineProps {
    comments: FeedbackItemComment[];
    duration: number;
    currentTime: number;
    bufferedEnd: number;
    isEditMode: boolean;
    selectedCommentId: string | null;
    onSeek: (time: number) => void;
    onCommentClick: (comment: FeedbackItemComment) => void;
    onCommentUpdate: (commentId: string, updates: { startTime?: number; endTime?: number }) => void;
    onEditModeToggle: () => void;
}

const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const VideoFeedbackTimeline: React.FC<VideoFeedbackTimelineProps> = ({
    comments,
    duration,
    currentTime,
    bufferedEnd,
    isEditMode,
    selectedCommentId,
    onSeek,
    onCommentClick,
    onCommentUpdate,
    onEditModeToggle
}) => {
    const timelineRef = useRef<HTMLDivElement>(null);
    const [dragging, setDragging] = useState<{ commentId: string; handle: 'start' | 'end' | 'bar'; initialX: number; initialStart: number; initialEnd: number } | null>(null);

    // Sort comments by startTime or timestamp
    const sortedComments = [...comments].sort((a, b) => {
        const aTime = a.startTime ?? a.timestamp ?? 0;
        const bTime = b.startTime ?? b.timestamp ?? 0;
        return aTime - bTime;
    });

    const handleTimelineClick = (e: React.MouseEvent) => {
        if (dragging || !timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        onSeek(Math.max(0, Math.min(duration, pos * duration)));
    };

    const handleMouseDown = (e: React.MouseEvent, commentId: string, handle: 'start' | 'end' | 'bar') => {
        e.stopPropagation();
        const comment = comments.find(c => c.id === commentId);
        if (!comment) return;
        
        setDragging({
            commentId,
            handle,
            initialX: e.clientX,
            initialStart: comment.startTime ?? comment.timestamp ?? 0,
            initialEnd: comment.endTime ?? (comment.startTime ?? comment.timestamp ?? 0) + 5
        });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!dragging || !timelineRef.current) return;
        
        const rect = timelineRef.current.getBoundingClientRect();
        const deltaX = e.clientX - dragging.initialX;
        const deltaTime = (deltaX / rect.width) * duration;
        
        let newStart = dragging.initialStart;
        let newEnd = dragging.initialEnd;
        
        if (dragging.handle === 'start') {
            newStart = Math.max(0, Math.min(dragging.initialEnd - 0.5, dragging.initialStart + deltaTime));
        } else if (dragging.handle === 'end') {
            newEnd = Math.max(dragging.initialStart + 0.5, Math.min(duration, dragging.initialEnd + deltaTime));
        } else if (dragging.handle === 'bar') {
            const barDuration = dragging.initialEnd - dragging.initialStart;
            newStart = Math.max(0, Math.min(duration - barDuration, dragging.initialStart + deltaTime));
            newEnd = newStart + barDuration;
        }
        
        onCommentUpdate(dragging.commentId, { startTime: newStart, endTime: newEnd });
    }, [dragging, duration, onCommentUpdate]);

    const handleMouseUp = useCallback(() => {
        setDragging(null);
    }, []);

    useEffect(() => {
        if (dragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [dragging, handleMouseMove, handleMouseUp]);

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    const buffered = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

    // Assign rows to avoid overlap
    const assignedRows: { commentId: string; row: number }[] = [];
    const getRow = (startTime: number, endTime: number): number => {
        let row = 0;
        while (true) {
            const conflict = assignedRows.find(r => {
                const c = comments.find(x => x.id === r.commentId);
                if (!c || r.row !== row) return false;
                const cStart = c.startTime ?? c.timestamp ?? 0;
                const cEnd = c.endTime ?? cStart + 5;
                return !(endTime <= cStart || startTime >= cEnd);
            });
            if (!conflict) break;
            row++;
        }
        return row;
    };

    const commentBars = sortedComments.map(comment => {
        const startTime = comment.startTime ?? comment.timestamp ?? 0;
        const endTime = comment.endTime ?? startTime + 5;
        const row = getRow(startTime, endTime);
        assignedRows.push({ commentId: comment.id, row });
        
        return { comment, startTime, endTime, row };
    });

    const maxRows = Math.max(1, ...commentBars.map(b => b.row + 1));
    const rowHeight = 24;

    return (
        <div className="bg-glass/40 backdrop-blur-xl rounded-lg border border-border-color p-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-4">
                    <h3 className="text-sm font-semibold text-text-primary">Feedback Timeline</h3>
                    <div className="text-xs text-text-secondary font-mono">{formatTime(currentTime)} / {formatTime(duration)}</div>
                </div>
                <button
                    onClick={onEditModeToggle}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${isEditMode ? 'bg-primary text-black' : 'bg-glass-light/60 backdrop-blur-sm text-text-primary hover:bg-glass-light/80'}`}
                >
                    {isEditMode ? 'Done Editing' : 'Edit Timeline'}
                </button>
            </div>

            {/* Timeline */}
            <div
                ref={timelineRef}
                className="relative bg-glass-light/60 backdrop-blur-sm rounded overflow-hidden cursor-pointer"
                style={{ height: `${Math.max(40, maxRows * rowHeight + 16)}px` }}
                onClick={handleTimelineClick}
            >
                {/* Buffered Bar */}
                <div 
                    className="absolute top-0 left-0 h-1 bg-white/10"
                    style={{ width: `${buffered}%` }}
                />
                
                {/* Comment Bars */}
                {commentBars.map(({ comment, startTime, endTime, row }) => {
                    const left = (startTime / duration) * 100;
                    const width = ((endTime - startTime) / duration) * 100;
                    const isResolved = comment.resolved || comment.status === 'Resolved';
                    const isSelected = selectedCommentId === comment.id;
                    
                    return (
                        <div
                            key={comment.id}
                            className={`absolute rounded-sm transition-all ${isSelected ? 'ring-2 ring-white z-20' : 'z-10'}`}
                            style={{
                                left: `${left}%`,
                                width: `${Math.max(width, 1)}%`,
                                top: `${row * rowHeight + 8}px`,
                                height: `${rowHeight - 4}px`,
                                backgroundColor: '#A3E635',
                                opacity: isResolved ? 0.5 : 1,
                                cursor: isEditMode ? 'grab' : 'pointer'
                            }}
                            onClick={(e) => { e.stopPropagation(); onCommentClick(comment); }}
                            onMouseDown={isEditMode ? (e) => handleMouseDown(e, comment.id, 'bar') : undefined}
                        >
                            {/* Handles (Edit Mode Only) */}
                            {isEditMode && (
                                <>
                                    <div
                                        className="absolute left-0 top-0 bottom-0 w-2 bg-black/30 hover:bg-black/50 cursor-ew-resize rounded-l-sm"
                                        onMouseDown={(e) => handleMouseDown(e, comment.id, 'start')}
                                    />
                                    <div
                                        className="absolute right-0 top-0 bottom-0 w-2 bg-black/30 hover:bg-black/50 cursor-ew-resize rounded-r-sm"
                                        onMouseDown={(e) => handleMouseDown(e, comment.id, 'end')}
                                    />
                                </>
                            )}
                            
                            {/* Pin Number */}
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-black/70">
                                {comment.pin_number || ''}
                            </div>
                        </div>
                    );
                })}

                {/* Playhead */}
                <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-primary z-30 pointer-events-none"
                    style={{ left: `${progress}%` }}
                >
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full" />
                </div>

                {/* Time Markers */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs text-text-secondary/50 pointer-events-none">
                    <span>0:00</span>
                    <span>{formatTime(duration / 4)}</span>
                    <span>{formatTime(duration / 2)}</span>
                    <span>{formatTime((duration * 3) / 4)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-3 text-xs text-text-secondary">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-primary" />
                    <span>Active</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-primary opacity-50" />
                    <span>Resolved</span>
                </div>
            </div>
        </div>
    );
};

export default VideoFeedbackTimeline;
