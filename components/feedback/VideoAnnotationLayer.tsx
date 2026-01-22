import React, { useState, useRef, useCallback } from 'react';
import { FeedbackItemComment } from '../../types';

interface VideoAnnotationLayerProps {
    comments: FeedbackItemComment[];
    currentTime: number;
    zoom: number;
    pan: { x: number; y: number };
    showPins: boolean;
    isCommenting: boolean;
    videoWidth: number;
    videoHeight: number;
    selectedCommentId: string | null;
    onPinClick: (comment: FeedbackItemComment) => void;
    onAddPin: (x: number, y: number) => void;
}

const VideoAnnotationLayer: React.FC<VideoAnnotationLayerProps> = ({
    comments,
    currentTime,
    zoom,
    pan,
    showPins,
    isCommenting,
    videoWidth,
    videoHeight,
    selectedCommentId,
    onPinClick,
    onAddPin
}) => {
    const layerRef = useRef<HTMLDivElement>(null);
    const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

    // Filter comments that are visible at current time
    const visibleComments = comments.filter(comment => {
        if (!showPins) return false;
        
        // Check if comment has spatial coordinates
        if (comment.x_coordinate === undefined || comment.y_coordinate === undefined) return false;
        
        // Check temporal visibility (comment visible when currentTime is within its range)
        const startTime = comment.startTime ?? comment.timestamp ?? 0;
        const endTime = comment.endTime ?? startTime + 5;
        
        return currentTime >= startTime && currentTime <= endTime;
    });

    const handleClick = (e: React.MouseEvent) => {
        if (!isCommenting || !layerRef.current) return;
        
        const rect = layerRef.current.getBoundingClientRect();
        // Calculate position relative to the unzoomed video
        const x = ((e.clientX - rect.left) / zoom) - (pan.x / zoom);
        const y = ((e.clientY - rect.top) / zoom) - (pan.y / zoom);
        
        // Normalize to percentage of video dimensions for storage
        const xPercent = (x / videoWidth) * 100;
        const yPercent = (y / videoHeight) * 100;
        
        if (xPercent >= 0 && xPercent <= 100 && yPercent >= 0 && yPercent <= 100) {
            onAddPin(x, y);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isCommenting || !layerRef.current) {
            setHoverPos(null);
            return;
        }
        
        const rect = layerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / zoom) - (pan.x / zoom);
        const y = ((e.clientY - rect.top) / zoom) - (pan.y / zoom);
        setHoverPos({ x, y });
    };

    const handleMouseLeave = () => {
        setHoverPos(null);
    };

    return (
        <div 
            ref={layerRef}
            className="absolute inset-0 pointer-events-auto"
            style={{
                cursor: isCommenting ? 'crosshair' : 'default',
                width: videoWidth * zoom,
                height: videoHeight * zoom,
                transform: `translate(${pan.x}px, ${pan.y}px)`,
                transformOrigin: 'top left'
            }}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* Ghost Pin (while hovering in comment mode) */}
            {isCommenting && hoverPos && (
                <div
                    className="absolute pointer-events-none"
                    style={{
                        left: hoverPos.x * zoom,
                        top: hoverPos.y * zoom,
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    <div className="w-8 h-8 rounded-full bg-primary/50 border-2 border-primary flex items-center justify-center text-xs font-bold text-black animate-pulse">
                        +
                    </div>
                </div>
            )}

            {/* Existing Pins */}
            {visibleComments.map(comment => {
                const isSelected = selectedCommentId === comment.id;
                const isResolved = comment.resolved || comment.status === 'Resolved';
                
                return (
                    <div
                        key={comment.id}
                        className={`absolute cursor-pointer transition-transform hover:scale-110 ${isSelected ? 'z-50' : 'z-40'}`}
                        style={{
                            left: (comment.x_coordinate || 0) * zoom,
                            top: (comment.y_coordinate || 0) * zoom,
                            transform: 'translate(-50%, -50%)',
                            pointerEvents: 'auto'
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onPinClick(comment);
                        }}
                    >
                        <div 
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg transition-all ${
                                isSelected 
                                    ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' 
                                    : ''
                            } ${
                                isResolved 
                                    ? 'bg-green-500 text-white opacity-70' 
                                    : 'bg-primary text-black'
                            }`}
                            title={comment.commentText}
                        >
                            {comment.pin_number || '?'}
                        </div>
                        
                        {/* Tooltip on hover */}
                        {isSelected && comment.commentText && (
                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-surface border border-border-color rounded-lg p-2 shadow-xl z-50 whitespace-nowrap max-w-xs">
                                <p className="text-xs text-text-primary truncate">{comment.commentText}</p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default VideoAnnotationLayer;
