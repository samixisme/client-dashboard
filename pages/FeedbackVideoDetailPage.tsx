import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
    getFeedbackItem, 
    subscribeToComments, 
    addComment, 
    updateComment,
    toggleCommentResolved, 
    deleteComment,
    updateFeedbackItemStatus,
    syncCommentToCalendar
} from '../utils/feedbackUtils';
import { FeedbackItem, FeedbackItemComment, FeedbackComment, User } from '../types';
import { useData } from '../contexts/DataContext';
import FeedbackSidebar from '../components/feedback/FeedbackSidebar';
import VideoPlayerHUD from '../components/feedback/VideoPlayerHUD';
import VideoFeedbackTimeline from '../components/feedback/VideoFeedbackTimeline';
import VideoAnnotationLayer from '../components/feedback/VideoAnnotationLayer';
import CommentPopover from '../components/feedback/CommentPopover';
import { ArrowRightIcon } from '../components/icons/ArrowRightIcon';
import { db, auth } from '../utils/firebase';
import { collection, getDocs } from 'firebase/firestore';

const FeedbackVideoDetailPage = () => {
    const { projectId, feedbackItemId } = useParams<{ projectId: string; feedbackItemId: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useData();

    // Core Data
    const [feedbackItem, setFeedbackItem] = useState<FeedbackItem | null>(null);
    const [comments, setComments] = useState<FeedbackItemComment[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const path = searchParams.get('path');
    const activeVideoUrl = (path && feedbackItem) ? path : feedbackItem?.assetUrl;

    // Video State
    const videoRef = useRef<HTMLVideoElement>(null);
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [bufferedEnd, setBufferedEnd] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    // Zoom & Pan
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });

    // UI State
    const [showPins, setShowPins] = useState(true);
    const [showControls, setShowControls] = useState(true); // Collapsible HUD/Timeline
    const [isCommenting, setIsCommenting] = useState(false);
    const [isTimelineEditMode, setIsTimelineEditMode] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [sidebarView, setSidebarView] = useState<'comments' | 'activity'>('comments');
    const [sidebarPosition, setSidebarPosition] = useState<'right' | 'bottom'>('right');
    const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);

    // Popover State
    const [popover, setPopover] = useState<{
        isOpen: boolean;
        x: number;
        y: number;
        comment?: FeedbackItemComment;
        isNew?: boolean;
    }>({ isOpen: false, x: 0, y: 0 });

    // Description Edit State
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedDescription, setEditedDescription] = useState('');

    // Auth
    const [currentUserId, setCurrentUserId] = useState<string>(auth.currentUser?.uid || '');

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((authUser) => {
            if (authUser) {
                setCurrentUserId(authUser.uid);
            } else {
                setCurrentUserId('guest-user');
            }
        });
        return () => unsubscribe();
    }, []);

    // Fetch Data
    useEffect(() => {
        if (projectId && feedbackItemId) {
            getFeedbackItem(projectId, feedbackItemId).then((item) => {
                setFeedbackItem(item);
                setEditedDescription(item?.description || '');
                setLoading(false);
            });

            const unsubscribe = subscribeToComments(projectId, feedbackItemId, (fetchedComments) => {
                // Sort by startTime or timestamp
                const sorted = fetchedComments.sort((a, b) => {
                    const aTime = a.startTime ?? a.timestamp ?? 0;
                    const bTime = b.startTime ?? b.timestamp ?? 0;
                    return aTime - bTime;
                });
                setComments(sorted);
            });

            return () => unsubscribe();
        }
    }, [projectId, feedbackItemId]);

    // Fetch Users
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const usersSnapshot = await getDocs(collection(db, 'users'));
                const fetchedUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                setUsers(fetchedUsers);
            } catch (error) {
                console.error("Error fetching users:", error);
            }
        };
        fetchUsers();
    }, []);

    // Video Event Handlers
    const handlePlay = () => {
        if (videoRef.current) {
            videoRef.current.play();
            setIsPlaying(true);
        }
    };

    const handlePause = () => {
        if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleStop = () => {
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
            setIsPlaying(false);
            setCurrentTime(0);
        }
    };

    const handleSeek = (time: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const handleRateChange = (rate: number) => {
        if (videoRef.current) {
            videoRef.current.playbackRate = rate;
            setPlaybackRate(rate);
        }
    };

    const handleVolumeChange = (vol: number) => {
        if (videoRef.current) {
            videoRef.current.volume = vol;
            setVolume(vol);
            if (vol > 0) setIsMuted(false);
        }
    };

    const handleMuteToggle = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            
            // Update buffered
            if (videoRef.current.buffered.length > 0) {
                setBufferedEnd(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
            }
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            setVideoDimensions({
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight
            });
        }
    };

    // Zoom & Pan Handlers
    const handleZoomChange = (newZoom: number) => {
        setZoom(Math.max(0.1, Math.min(5, newZoom)));
    };

    const handlePanStart = (e: React.MouseEvent) => {
        if (zoom > 1 && !isCommenting) {
            setIsPanning(true);
            setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
    };

    const handlePanMove = (e: React.MouseEvent) => {
        if (isPanning && zoom > 1) {
            setPan({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y
            });
        }
    };

    const handlePanEnd = () => {
        setIsPanning(false);
    };

    // Comment Handlers
    const handleAddComment = () => {
        if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
            setIsCommenting(true);
        }
    };

    const handleAddPin = async (x: number, y: number) => {
        if (!projectId || !feedbackItemId) return;
        
        // Calculate next pin number
        const maxPin = comments.reduce((max, c) => Math.max(max, c.pin_number || 0), 0);
        
        setPopover({
            isOpen: true,
            x,
            y,
            isNew: true
        });
        setIsCommenting(false);
    };

    const handlePopoverSubmit = async (text: string, details?: { startTime?: number; endTime?: number; dueDate?: string }) => {
        if (!projectId || !feedbackItemId || !text.trim()) return;

        try {
            const maxPin = comments.reduce((max, c) => Math.max(max, c.pin_number || 0), 0);

            const commentData: Partial<FeedbackItemComment> = {
                authorId: currentUserId,
                commentText: text,
                startTime: details?.startTime ?? currentTime,
                endTime: details?.endTime ?? (currentTime + 5),
                x_coordinate: popover.x,
                y_coordinate: popover.y,
                pin_number: maxPin + 1,
                status: 'Active',
                dueDate: details?.dueDate
            };

            const commentId = await addComment(projectId, feedbackItemId, commentData);

            if (details?.dueDate) {
                await syncCommentToCalendar(commentId, text, details.dueDate, currentUserId, projectId);
            }

            setPopover({ isOpen: false, x: 0, y: 0 });
        } catch (error) {
            console.error("Failed to add comment:", error);
        }
    };

    const handleCommentUpdate = async (commentId: string, updates: Partial<FeedbackComment>) => {
        if (!projectId || !feedbackItemId) return;

        const itemUpdates: Partial<FeedbackItemComment> & { comment?: string } = { ...updates };
        if (updates.comment) {
            itemUpdates.commentText = updates.comment;
            delete itemUpdates.comment;
        }

        await updateComment(projectId, feedbackItemId, commentId, itemUpdates);
        
        if (updates.dueDate) {
            const comment = comments.find(c => c.id === commentId);
            if (comment?.commentText) {
                await syncCommentToCalendar(commentId, comment.commentText, updates.dueDate, currentUserId, projectId);
            }
        }
    };

    const handleTimelineCommentUpdate = async (commentId: string, updates: { startTime?: number; endTime?: number }) => {
        if (!projectId || !feedbackItemId) return;
        await updateComment(projectId, feedbackItemId, commentId, updates);
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!projectId || !feedbackItemId) return;
        await deleteComment(projectId, feedbackItemId, commentId, currentUserId);
        if (popover.comment?.id === commentId) {
            setPopover({ isOpen: false, x: 0, y: 0 });
        }
    };

    const handleResolveComment = async (commentId: string) => {
        if (!projectId || !feedbackItemId) return;
        const comment = comments.find(c => c.id === commentId);
        if (comment) {
            await toggleCommentResolved(projectId, feedbackItemId, commentId, comment.resolved, currentUserId);
        }
    };

    const handleCommentClick = (comment: FeedbackItemComment) => {
        setSelectedCommentId(comment.id);
        
        // Seek to comment start time
        const seekTime = comment.startTime ?? comment.timestamp ?? 0;
        handleSeek(seekTime);

        // Open popover
        setPopover({
            isOpen: true,
            x: comment.x_coordinate ?? 100,
            y: comment.y_coordinate ?? 100,
            comment,
            isNew: false
        });
    };

    const handlePinClick = (comment: FeedbackItemComment) => {
        handleCommentClick(comment);
    };

    // Convert comment for popover
    const activeComment = useMemo(() => {
        if (!popover.isOpen || !popover.comment) return null;
        if (popover.isNew) return null;
        
        const latest = comments.find(c => c.id === popover.comment?.id) || popover.comment;
        return {
            id: latest.id,
            projectId: projectId || '',
            targetId: feedbackItemId || '',
            targetType: 'video' as const,
            comment: latest.commentText || '',
            reporterId: latest.authorId,
            status: (latest.status as 'Active' | 'Resolved') || 'Active',
            timestamp: typeof latest.createdAt === 'string' ? latest.createdAt : new Date().toISOString(),
            pin_number: latest.pin_number || 0,
            startTime: latest.startTime,
            endTime: latest.endTime,
            dueDate: latest.dueDate,
            replies: latest.replies
        } as FeedbackComment;
    }, [popover, comments, projectId, feedbackItemId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <div className="text-text-secondary">Loading...</div>
            </div>
        );
    }

    if (!feedbackItem) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <div className="text-text-secondary">Video not found</div>
            </div>
        );
    }

    const displayedVideoWidth = videoDimensions.width || 1920;
    const displayedVideoHeight = videoDimensions.height || 1080;

    return (
        <div className={`flex overflow-hidden ${sidebarPosition === 'bottom' ? 'flex-col' : 'flex-row'} h-[calc(100vh-100px)]`}>
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-background overflow-hidden">
                {/* Header with Description */}
                <div className="p-4 border-b border-border-color bg-glass">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl font-bold text-text-primary truncate">{feedbackItem.name}</h1>
                            
                            {/* Description Module */}
                            {isEditingDescription ? (
                                <div className="mt-2">
                                    <textarea
                                        value={editedDescription}
                                        onChange={(e) => setEditedDescription(e.target.value)}
                                        className="w-full p-2 bg-glass-light border border-border-color rounded-lg text-sm text-text-primary resize-none focus:ring-1 focus:ring-primary outline-none"
                                        rows={3}
                                        placeholder="Add a description..."
                                    />
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={() => setIsEditingDescription(false)}
                                            className="px-3 py-1 text-xs bg-glass-light text-text-primary rounded hover:bg-border-color"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => {
                                                // TODO: Save description to Firebase
                                                setIsEditingDescription(false);
                                            }}
                                            className="px-3 py-1 text-xs bg-primary text-black font-bold rounded hover:bg-primary-hover"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p 
                                    className="mt-1 text-sm text-text-secondary line-clamp-2 cursor-pointer hover:text-text-primary"
                                    onClick={() => setIsEditingDescription(true)}
                                >
                                    {feedbackItem.description || 'Click to add description...'}
                                </p>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Approve/Approved Toggle Button */}
                            <button
                                onClick={async () => {
                                    if (projectId && feedbackItemId && feedbackItem) {
                                        const newStatus = feedbackItem.status === 'approved' ? 'pending' : 'approved';
                                        // Update local state immediately for instant feedback
                                        setFeedbackItem({ ...feedbackItem, status: newStatus });
                                        // Then persist to Firebase
                                        await updateFeedbackItemStatus(projectId, feedbackItemId, newStatus, user?.uid);
                                    }
                                }}
                                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
                                    feedbackItem.status === 'approved' 
                                        ? 'bg-primary text-black' 
                                        : 'bg-glass-light text-text-primary hover:bg-primary/20 border border-border-color'
                                }`}
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <path d="M20 6L9 17l-5-5" />
                                </svg>
                                {feedbackItem.status === 'approved' ? 'Approved' : 'Approve'}
                            </button>
                            
                            {/* Show/Hide Controls Toggle */}
                            <button 
                                onClick={() => setShowControls(!showControls)}
                                className={`p-2 rounded-lg transition-colors border border-border-color ${
                                    showControls ? 'bg-glass-light text-text-primary' : 'bg-primary/20 text-primary'
                                }`}
                                title={showControls ? 'Hide Controls (Focus Mode)' : 'Show Controls'}
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    {showControls ? (
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
                                    ) : (
                                        <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                                    )}
                                </svg>
                            </button>
                            
                            {/* Sidebar Toggle (inline - shows when sidebar is closed) */}
                            {!isSidebarOpen && (
                                <button 
                                    onClick={() => setIsSidebarOpen(true)}
                                    className="p-2 bg-primary text-black rounded-lg hover:bg-primary-hover transition-colors"
                                    title="Open Sidebar"
                                >
                                    <ArrowRightIcon className="w-4 h-4 transform rotate-180" />
                                </button>
                            )}
                            
                            {/* Sidebar Position Toggle */}
                            <button 
                                onClick={() => setSidebarPosition(p => p === 'right' ? 'bottom' : 'right')}
                                className="p-2 bg-glass-light rounded-lg text-text-primary hover:bg-border-color border border-border-color"
                                title="Toggle sidebar position"
                            >
                                <div className={`w-4 h-4 border-2 border-current ${sidebarPosition === 'right' ? 'border-b-transparent' : 'border-r-transparent'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Video Player Area */}
                <div 
                    ref={videoContainerRef}
                    className="flex-1 bg-black relative overflow-hidden flex items-center justify-center"
                    onMouseDown={handlePanStart}
                    onMouseMove={handlePanMove}
                    onMouseUp={handlePanEnd}
                    onMouseLeave={handlePanEnd}
                    style={{ cursor: zoom > 1 && !isCommenting ? 'grab' : 'default' }}
                >
                    {/* Video + Annotation Layer */}
                    <div 
                        className="relative"
                        style={{
                            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                            transformOrigin: 'center center'
                        }}
                    >
                        <video
                            ref={videoRef}
                            src={activeVideoUrl}
                            className="max-w-full max-h-[calc(100vh-350px)] object-contain"
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onClick={() => isPlaying ? handlePause() : handlePlay()}
                            controls={false}
                            playsInline
                        />
                        
                        {/* Annotation Layer */}
                        <VideoAnnotationLayer
                            comments={comments}
                            currentTime={currentTime}
                            zoom={1} // Already scaled by parent
                            pan={{ x: 0, y: 0 }}
                            showPins={showPins}
                            isCommenting={isCommenting}
                            videoWidth={displayedVideoWidth}
                            videoHeight={displayedVideoHeight}
                            selectedCommentId={selectedCommentId}
                            onPinClick={handlePinClick}
                            onAddPin={handleAddPin}
                        />
                    </div>

                    {/* Commenting Mode Indicator */}
                    {isCommenting && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary text-black px-4 py-2 rounded-lg font-bold text-sm shadow-lg z-50">
                            Click on the video to place a pin
                            <button 
                                onClick={() => setIsCommenting(false)}
                                className="ml-3 text-black/60 hover:text-black"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>

                {/* HUD Controls - Collapsible */}
                {showControls && (
                    <div className="p-4 bg-surface border-t border-border-color">
                        <VideoPlayerHUD
                            videoRef={videoRef}
                            duration={duration}
                            currentTime={currentTime}
                            bufferedEnd={bufferedEnd}
                            isPlaying={isPlaying}
                            playbackRate={playbackRate}
                            volume={volume}
                            isMuted={isMuted}
                            zoom={zoom}
                            showPins={showPins}
                            onPlay={handlePlay}
                            onPause={handlePause}
                            onStop={handleStop}
                            onSeek={handleSeek}
                            onRateChange={handleRateChange}
                            onVolumeChange={handleVolumeChange}
                            onMuteToggle={handleMuteToggle}
                            onZoomChange={handleZoomChange}
                            onPinsToggle={() => setShowPins(!showPins)}
                            onAddComment={handleAddComment}
                            comments={comments}
                        />
                    </div>
                )}

                {/* Feedback Timeline - Collapsible */}
                {showControls && (
                    <div className="p-4 bg-surface border-t border-border-color">
                        <VideoFeedbackTimeline
                            comments={comments}
                            duration={duration}
                            currentTime={currentTime}
                            bufferedEnd={bufferedEnd}
                            isEditMode={isTimelineEditMode}
                            selectedCommentId={selectedCommentId}
                            onSeek={handleSeek}
                            onCommentClick={handleCommentClick}
                            onCommentUpdate={handleTimelineCommentUpdate}
                            onEditModeToggle={() => setIsTimelineEditMode(!isTimelineEditMode)}
                        />
                    </div>
                )}
            </div>


            {/* Sidebar */}
            <div className={`${
                isSidebarOpen 
                    ? (sidebarPosition === 'right' ? 'w-80 lg:w-96 max-w-[calc(100vw-80px)] border-l' : 'h-64 lg:h-80 w-full border-t') 
                    : 'w-0 h-0 opacity-0 pointer-events-none'
            } transition-all duration-300 bg-surface border-border-color flex flex-col overflow-hidden z-20 flex-shrink-0`}>
                {/* Sidebar Header */}
                <div className="p-4 border-b border-border-color flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="font-bold text-text-primary">Feedback</h2>
                        <div className="flex gap-4 text-xs text-text-secondary mt-1">
                            <button 
                                onClick={() => setSidebarView('comments')}
                                className={sidebarView === 'comments' ? 'text-primary font-bold' : 'hover:text-text-primary'}
                            >
                                Comments ({comments.length})
                            </button>
                            <button 
                                onClick={() => setSidebarView('activity')}
                                className={sidebarView === 'activity' ? 'text-primary font-bold' : 'hover:text-text-primary'}
                            >
                                Activity
                            </button>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsSidebarOpen(false)}
                        className="text-text-secondary hover:text-text-primary p-1"
                    >
                        <ArrowRightIcon className={`w-5 h-5 ${sidebarPosition === 'bottom' ? 'rotate-90' : ''}`} />
                    </button>
                </div>

                {/* Sidebar Content */}
                <div className="flex-1 overflow-hidden">
                    <FeedbackSidebar
                        view={sidebarView}
                        onViewChange={setSidebarView}
                        comments={comments}
                        onCommentClick={handleCommentClick}
                        onClose={() => {}}
                        onDelete={handleDeleteComment}
                        onResolve={handleResolveComment}
                        onUpdate={handleCommentUpdate}
                        position={sidebarPosition}
                        users={users}
                        currentUserId={currentUserId}
                    />
                </div>
            </div>

            {/* Comment Popover */}
            {popover.isOpen && (
                <div className="fixed inset-0 z-50 pointer-events-none">
                    <div className="pointer-events-auto">
                        <CommentPopover
                            comment={activeComment}
                            coords={{ x: popover.x + 100, y: popover.y + 100 }}
                            contentRef={videoContainerRef}
                            zoom={1}
                            onClose={() => setPopover({ isOpen: false, x: 0, y: 0 })}
                            onSubmit={handlePopoverSubmit}
                            onUpdate={handleCommentUpdate}
                            onResolve={handleResolveComment}
                            onDelete={handleDeleteComment}
                            targetType="video"
                            videoCurrentTime={currentTime}
                            users={users}
                            currentUserId={currentUserId}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeedbackVideoDetailPage;
