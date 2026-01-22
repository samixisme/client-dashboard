import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../utils/calendarSync';
// FIX: Added VideoAsset to types import
import { FeedbackComment, FeedbackMockup, FeedbackWebsite, FeedbackVideo, MockupImage, DeviceView, User, VideoAsset } from '../types';
import CommentPopover from '../components/feedback/CommentPopover';
import FeedbackSidebar from '../components/feedback/FeedbackSidebar';

import { ZoomInIcon } from '../components/icons/ZoomInIcon';
import { ZoomOutIcon } from '../components/icons/ZoomOutIcon';
import { CommentsIcon } from '../components/icons/CommentsIcon';
import { GridViewIcon } from '../components/icons/GridViewIcon';
import { ActivityIcon } from '../components/icons/ActivityIcon';
import { EyeIcon } from '../components/icons/EyeIcon';
import { EyeOffIcon } from '../components/icons/EyeOffIcon';
import { MoreIcon } from '../components/icons/MoreIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import { LinkIcon } from '../components/icons/LinkIcon';
import { PanIcon } from '../components/icons/PanIcon';
import { AddIcon } from '../components/icons/AddIcon';
import { PlayIcon } from '../components/icons/PlayIcon';
import { PauseIcon } from '../components/icons/PauseIcon';
import { StopIcon } from '../components/icons/StopIcon';
import { VolumeUpIcon } from '../components/icons/VolumeUpIcon';
import { VolumeOffIcon } from '../components/icons/VolumeOffIcon';
import { ListIcon } from '../components/icons/ListIcon';
import { EditIcon } from '../components/icons/EditIcon';
import { ChevronDownIcon } from '../components/icons/ChevronDownIcon';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { RefreshIcon } from '../components/icons/RefreshIcon';

type FeedbackItem = FeedbackWebsite | FeedbackMockup | FeedbackVideo;
type SidebarPosition = 'right' | 'bottom';

const FeedbackItemPage = () => {
    const { projectId, itemType, itemId } = useParams<{ projectId: string; itemType: 'website' | 'mockup' | 'video'; itemId: string }>();
    const [searchParams] = useSearchParams();
    const imageId = searchParams.get('imageId');
    const commentIdToOpen = searchParams.get('commentId');
    // FIX: Get videoAssetId from URL search params to identify specific video in a collection.
    const videoAssetIdParam = searchParams.get('videoAssetId');
    const navigate = useNavigate();
    
    const { data, forceUpdate } = useData();
    
    const [item, setItem] = useState<FeedbackItem | undefined>();
    const [localComments, setLocalComments] = useState<FeedbackComment[]>([]);
    const [currentImage, setCurrentImage] = useState<MockupImage | undefined>();
    // FIX: Add state to hold the currently active video asset.
    const [currentVideoAsset, setCurrentVideoAsset] = useState<VideoAsset | undefined>();
    const [activeComment, setActiveComment] = useState<FeedbackComment | null>(null);
    const [newCommentCoords, setNewCommentCoords] = useState<{ x: number, y: number } | null>(null);
    const [sidebarView, setSidebarView] = useState<'comments' | 'activity' | null>('comments');
    const [sidebarPosition, setSidebarPosition] = useState<SidebarPosition>('right');
    const [pinsVisible, setPinsVisible] = useState(true);
    
    const contentRef = useRef<HTMLDivElement>(null);
    const viewerContainerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const controlsTimeoutRef = useRef<number | null>(null);
    const volumeControlRef = useRef<HTMLDivElement>(null);
    const speedControlRef = useRef<HTMLDivElement>(null);

    const [zoom, setZoom] = useState(1);
    const [fitZoom, setFitZoom] = useState(1);
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [copySuccess, setCopySuccess] = useState('');
    const [deviceView, setDeviceView] = useState<DeviceView>('desktop');
    const [interactionMode, setInteractionMode] = useState<'comment' | 'navigate'>('comment');
    const [currentIframePage, setCurrentIframePage] = useState<string>('/');
    const [isEditMode, setIsEditMode] = useState(false);

    // Video-specific state
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showControls, setShowControls] = useState(true);
    const [isAddingComment, setIsAddingComment] = useState(false);
    const [isPlacingVideoComment, setIsPlacingVideoComment] = useState(false);
    const [isVolumeOpen, setIsVolumeOpen] = useState(false);
    const [isSpeedOpen, setIsSpeedOpen] = useState(false);
    const [draggingComment, setDraggingComment] = useState<{commentId: string; handle: 'start' | 'end' | 'move', startX: number, originalStart: number, originalEnd: number} | null>(null);

    const onCommentClick = useCallback((comment: FeedbackComment) => {
        setNewCommentCoords(null);
        setIsAddingComment(false);
        setActiveComment(comment);
        if (itemType === 'video' && videoRef.current && comment.startTime !== undefined) {
            videoRef.current.currentTime = comment.startTime;
        }
    }, [itemType]);

     useEffect(() => {
        if (commentIdToOpen) {
            const commentToOpen = data.feedbackComments.find(c => c.id === commentIdToOpen);
            if (commentToOpen) {
                // A short delay to ensure everything is rendered before opening the popover
                setTimeout(() => {
                    onCommentClick(commentToOpen);
                }, 100);
            }
        }
    }, [commentIdToOpen, data.feedbackComments, onCommentClick]);

    const isWebsite = itemType === 'website';
    const isMockup = itemType === 'mockup';
    const isVideo = itemType === 'video';
    
    const getMember = (id: string | undefined): User | undefined => id ? data.users.find(m => m.id === id) : undefined;

    const deviceDimensions: Record<DeviceView, { width: string; height: string }> = {
        desktop: { width: '100%', height: '100%' },
        notebook: { width: '1440px', height: '900px' },
        tablet: { width: '768px', height: '1024px' },
        phone: { width: '375px', height: '812px' },
    };

    const navigateToPage = useCallback((path: string) => {
        if (iframeRef.current && itemType === 'website' && item && 'url' in item) {
            try {
                const baseUrl = new URL(item.url);
                iframeRef.current.src = `${baseUrl.origin}${path}`;
                setInteractionMode('navigate');
                setCurrentIframePage(path);
            } catch (e) {
                console.error("Invalid base URL for iframe navigation", e);
            }
        }
    }, [item, itemType]);

    useEffect(() => {
        let currentItem: FeedbackItem | undefined;
        if (itemType === 'website') currentItem = data.feedbackWebsites.find(i => i.id === itemId);
        // FIX: Handle video asset selection from URL param.
        if (itemType === 'video') {
            currentItem = data.feedbackVideos.find(i => i.id === itemId);
            if (currentItem) {
                const videoCollection = currentItem as FeedbackVideo;
                const videoAsset = videoCollection.videos.find(v => v.id === videoAssetIdParam);
                setCurrentVideoAsset(videoAsset || videoCollection.videos[0]);
            }
        }
        if (itemType === 'mockup') {
            currentItem = data.feedbackMockups.find(i => i.id === itemId);
            if (currentItem) {
                const image = (currentItem as FeedbackMockup).images.find(img => img.id === imageId);
                setCurrentImage(image || (currentItem as FeedbackMockup).images[0]);
            }
        }
        setItem(currentItem);
        
        if (itemId) {
            setLocalComments(data.feedbackComments.filter(c => c.targetId === itemId));
        }

        if(itemType !== 'mockup') setCurrentIframePage('/');
    }, [itemId, itemType, imageId, videoAssetIdParam, data]);

    const allCommentsForItem = useMemo(() => {
        return localComments.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [localComments]);

    const pinsForCurrentView = useMemo(() => {
        return allCommentsForItem.filter(c => {
            if (itemType === 'mockup') {
                const currentMockupImageId = imageId || (item as FeedbackMockup)?.images[0]?.id;
                return c.imageId === currentMockupImageId;
            }
            if (itemType === 'website') {
                const commentDeviceView = c.deviceView || 'desktop';
                if (commentDeviceView !== deviceView) return false;
                
                const commentPage = c.pageUrl || '/';
                return commentPage === currentIframePage;
            }
            // FIX: Filter video comments by the specific video asset being viewed.
            if (itemType === 'video') {
                return c.videoAssetId === currentVideoAsset?.id;
            }
            return c.targetType === itemType;
        });
    }, [allCommentsForItem, itemType, deviceView, currentIframePage, imageId, item, currentVideoAsset]);


    const calculateAndSetFitZoom = useCallback(() => {
        if (!viewerContainerRef.current) return 1;

        const container = viewerContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        const padding = 32;
        const availableWidth = containerRect.width - padding - (isVideo ? 80 : 0); // account for vertical controls
        const availableHeight = containerRect.height - padding;
        let newFitZoom = 1;

        if (isMockup && imageRef.current && imageRef.current.naturalWidth > 0) {
            const image = imageRef.current;
            const scaleX = availableWidth / image.naturalWidth;
            const scaleY = availableHeight / image.naturalHeight;
            newFitZoom = Math.min(scaleX, scaleY, 1);
        } else if (isWebsite) {
            const deviceW = parseInt(deviceDimensions[deviceView].width);
            const deviceH = parseInt(deviceDimensions[deviceView].height);
            
            if (deviceView !== 'desktop' && !isNaN(deviceW) && !isNaN(deviceH)) {
                const scaleX = availableWidth / deviceW;
                const scaleY = availableHeight / deviceH;
                newFitZoom = Math.min(scaleX, scaleY);
            } else {
                 newFitZoom = 1;
            }
        } else if (isVideo && videoRef.current && videoRef.current.videoWidth > 0) {
            const video = videoRef.current;
            const scaleX = availableWidth / video.videoWidth;
            const scaleY = availableHeight / video.videoHeight;
            newFitZoom = Math.min(scaleX, scaleY, 1);
        }
        
        setFitZoom(newFitZoom);
        return newFitZoom;
    }, [isMockup, isWebsite, isVideo, deviceView, deviceDimensions]);

    const handleClosePopover = useCallback(() => {
        setActiveComment(null);
        setNewCommentCoords(null);
        setIsAddingComment(false);
        setIsPlacingVideoComment(false);
    }, []);

    useEffect(() => {
        handleClosePopover(); 
    }, [deviceView, handleClosePopover, currentIframePage]);

    // Effect to handle resize - just update the fitZoom value for the button
    useEffect(() => {
        const handleResize = () => calculateAndSetFitZoom();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [calculateAndSetFitZoom]);

    // Effect for initial load and view changes - this resets zoom to fit
    useEffect(() => {
        // This effect should only run when the content we are viewing changes,
        // to reset the zoom to fit the new content.
        setTimeout(() => {
            const newFitZoom = calculateAndSetFitZoom();
            setZoom(newFitZoom);
        }, 50); // A small timeout to allow layout to settle
    }, [itemId, imageId, videoAssetIdParam, deviceView, calculateAndSetFitZoom]);


    const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (interactionMode !== 'comment' || isVideo) return;
        if ((e.target as HTMLElement).closest('.comment-pin') || (e.target as HTMLElement).closest('.comment-popover')) return;
        if (contentRef.current && viewerContainerRef.current) {
            const rect = contentRef.current.getBoundingClientRect();
            
            const x = (e.clientX - rect.left) / zoom;
            const y = (e.clientY - rect.top) / zoom;
            
            setActiveComment(null);
            setNewCommentCoords({ x, y });
        }
    };

    const handleInitiateAddVideoComment = () => {
        if (videoRef.current) {
            videoRef.current.pause();
            setIsPlacingVideoComment(true);
        }
    };

    const handleVideoClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isPlacingVideoComment) {
            if (videoRef.current) {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                // Position is relative to the rendered video element size
                setNewCommentCoords({ x, y });
                setIsAddingComment(true); // This shows popover
                setIsPlacingVideoComment(false);
            }
        } else {
            togglePlayPause();
        }
    };


    const handleCommentSubmit = (text: string, details?: { startTime?: number; endTime?: number; dueDate?: string; }) => {
        if (!projectId || !itemType || !itemId) return;

        const existingPins = localComments.filter(c => {
            if(itemType === 'website') return c.targetId === itemId && c.deviceView === deviceView && (c.pageUrl || '/') === currentIframePage;
            if(itemType === 'mockup') return c.imageId === currentImage?.id;
            // FIX: Filter by video asset ID when determining pin number.
            if(itemType === 'video') return c.videoAssetId === currentVideoAsset?.id;
            return false;
        });
        const newPinNumber = existingPins.length > 0 ? Math.max(...existingPins.map(c => c.pin_number)) + 1 : 1;

        let newComment: FeedbackComment;

        if (isVideo && details) {
            newComment = {
                id: `com-${Date.now()}`, projectId, targetId: itemId, targetType: 'video', comment: text, reporterId: 'user-1', 
                status: 'Active', timestamp: new Date().toISOString(), pin_number: newPinNumber,
                startTime: details.startTime, endTime: details.endTime,
                x_coordinate: newCommentCoords?.x,
                y_coordinate: newCommentCoords?.y,
                // FIX: Associate comment with the specific video asset.
                videoAssetId: currentVideoAsset?.id,
                dueDate: details.dueDate,
            };
        } else if ((isMockup || isWebsite) && newCommentCoords) {
            newComment = {
                id: `com-${Date.now()}`, projectId, targetId: itemId,
                imageId: isMockup ? currentImage?.id : undefined,
                deviceView: isWebsite ? deviceView : undefined,
                pageUrl: isWebsite ? currentIframePage : undefined,
                targetType: itemType, comment: text, reporterId: 'user-1', 
                x_coordinate: newCommentCoords.x, y_coordinate: newCommentCoords.y,
                status: 'Active', timestamp: new Date().toISOString(), pin_number: newPinNumber,
                dueDate: details?.dueDate,
            };
        } else {
            handleClosePopover();
            return;
        }

        data.feedbackComments.push(newComment);
        if (newComment.dueDate) {
            createCalendarEvent(newComment, 'comment');
        }
        setLocalComments(prev => [...prev, newComment]); // Instant update
        handleClosePopover();
        setActiveComment(newComment);
    };

    const handleUpdateComment = (commentId: string, updates: Partial<FeedbackComment>) => {
        const originalComment = data.feedbackComments.find(c => c.id === commentId);
        if (!originalComment) return;
        const originalDueDate = originalComment.dueDate;

        const update = (comments: FeedbackComment[]) => 
            comments.map(c => c.id === commentId ? { ...c, ...updates } : c);
        
        setLocalComments(update);
        data.feedbackComments = update(data.feedbackComments);

        if ('dueDate' in updates) {
            const newDueDate = updates.dueDate;
            const updatedComment = data.feedbackComments.find(c => c.id === commentId)!;

            if (newDueDate && !originalDueDate) {
                createCalendarEvent(updatedComment, 'comment');
            } else if (newDueDate && originalDueDate && newDueDate !== originalDueDate) {
                updateCalendarEvent(commentId, { startDate: newDueDate, endDate: newDueDate, title: `Comment #${updatedComment.pin_number}: ${updatedComment.comment.substring(0,30)}...` });
            } else if (!newDueDate && originalDueDate) {
                deleteCalendarEvent(commentId);
            }
        }

        forceUpdate();
    };


    const handleResolveComment = (commentId: string) => {
        const comment = data.feedbackComments.find(c => c.id === commentId);
        const newStatus = comment?.status === 'Resolved' ? 'Active' : 'Resolved';

        setLocalComments(prev => prev.map(c => c.id === commentId ? { ...c, status: newStatus } : c));
        if(comment) comment.status = newStatus;
    };

    const handleDeleteComment = (commentId: string) => {
        if (window.confirm('Are you sure you want to delete this comment?')) {
            setLocalComments(prev => prev.filter(c => c.id !== commentId));
            const index = data.feedbackComments.findIndex(c => c.id === commentId);
            if (index > -1) {
                if (data.feedbackComments[index].dueDate) {
                    deleteCalendarEvent(commentId);
                }
                data.feedbackComments.splice(index, 1);
            }
            handleClosePopover();
        }
    };

    const handlePinClick = (comment: FeedbackComment, e: React.MouseEvent) => {
        e.stopPropagation();
        onCommentClick(comment);
    }

    // --- Custom Video Player Logic ---
    const togglePlayPause = () => videoRef.current?.paused ? videoRef.current?.play() : videoRef.current?.pause();
    const handleStop = () => { if(videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.pause(); }};
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => setVolume(parseFloat(e.target.value));
    const toggleMute = () => setIsMuted(m => !m);
    const handlePlaybackRateChange = (rate: number) => { 
        setPlaybackRate(rate); 
        setIsSpeedOpen(false); 
    };

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const handleTime = () => setCurrentTime(video.currentTime);
        const handleDuration = () => setDuration(video.duration);
        const handleProgress = () => {
            if (video.buffered.length > 0) {
                setBuffered(video.buffered.end(video.buffered.length - 1));
            }
        };
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleVolume = () => { setVolume(video.volume); setIsMuted(video.muted); };
        
        video.addEventListener('timeupdate', handleTime);
        video.addEventListener('loadedmetadata', handleDuration);
        video.addEventListener('progress', handleProgress);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('volumechange', handleVolume);
        
        video.volume = volume;
        video.muted = isMuted;
        video.playbackRate = playbackRate;

        return () => {
            video.removeEventListener('timeupdate', handleTime);
            video.removeEventListener('loadedmetadata', handleDuration);
            video.removeEventListener('progress', handleProgress);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('volumechange', handleVolume);
        };
    }, [volume, isMuted, playbackRate, item]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isVolumeOpen && volumeControlRef.current && !volumeControlRef.current.contains(event.target as Node)) {
                setIsVolumeOpen(false);
            }
            if (isSpeedOpen && speedControlRef.current && !speedControlRef.current.contains(event.target as Node)) {
                setIsSpeedOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isVolumeOpen, isSpeedOpen]);

    // --- Timeline Drag Logic ---
    const handleTimelineDragStart = (e: React.MouseEvent, commentId: string, handle: 'start' | 'end' | 'move') => {
        e.preventDefault();
        e.stopPropagation();
        const comment = localComments.find(c => c.id === commentId);
        if (!comment || comment.startTime === undefined || comment.endTime === undefined) return;

        setDraggingComment({
            commentId, handle, startX: e.clientX,
            originalStart: comment.startTime,
            originalEnd: comment.endTime
        });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!draggingComment || !timelineRef.current || !duration) return;
        const timelineRect = timelineRef.current.getBoundingClientRect();
        const dx = e.clientX - draggingComment.startX;
        const timeDelta = (dx / timelineRect.width) * duration;
        
        setLocalComments(prev => prev.map(c => {
            if (c.id === draggingComment.commentId) {
                const newComment = {...c};
                 if (draggingComment.handle === 'move') {
                    const duration = draggingComment.originalEnd - draggingComment.originalStart;
                    newComment.startTime = Math.max(0, draggingComment.originalStart + timeDelta);
                    newComment.endTime = Math.min(duration, newComment.startTime + duration);
                } else if (draggingComment.handle === 'start') {
                    newComment.startTime = Math.max(0, Math.min(draggingComment.originalEnd - 0.5, draggingComment.originalStart + timeDelta));
                } else {
                    newComment.endTime = Math.min(duration, Math.max(draggingComment.originalStart + 0.5, draggingComment.originalEnd + timeDelta));
                }
                return newComment;
            }
            return c;
        }));
    }, [draggingComment, duration]);

    const handleMouseUp = useCallback(() => {
        if (draggingComment) {
            const finalUpdatedComment = localComments.find(c => c.id === draggingComment.commentId);
            if (finalUpdatedComment) {
                const globalIndex = data.feedbackComments.findIndex(c => c.id === draggingComment.commentId);
                if (globalIndex !== -1) {
                    data.feedbackComments[globalIndex] = { ...finalUpdatedComment };
                }
            }
            setDraggingComment(null);
        }
    }, [draggingComment, localComments, data.feedbackComments]);

    useEffect(() => {
        if (draggingComment) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.classList.add('is-dragging');
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.classList.remove('is-dragging');
        };
    }, [draggingComment, handleMouseMove, handleMouseUp]);

    // FIX: Corrected approval logic for different item types.
    const handleToggleApproval = () => {
        if (!item) return;

        if (isMockup && currentImage) {
            const mockup = item as FeedbackMockup;
            const approvedIds = mockup.approvedImageIds || [];
            if (approvedIds.includes(currentImage.id)) {
                mockup.approvedImageIds = approvedIds.filter(id => id !== currentImage.id);
            } else {
                mockup.approvedImageIds = [...approvedIds, currentImage.id];
            }
        } else if (isVideo && currentVideoAsset) {
            const videoCollection = item as FeedbackVideo;
            const approvedIds = videoCollection.approvedVideoIds || [];
            if (approvedIds.includes(currentVideoAsset.id)) {
                videoCollection.approvedVideoIds = approvedIds.filter(id => id !== currentVideoAsset.id);
            } else {
                videoCollection.approvedVideoIds = [...approvedIds, currentVideoAsset.id];
            }
        } else if (isWebsite) {
            (item as FeedbackWebsite).isApproved = !(item as FeedbackWebsite).isApproved;
        }
        forceUpdate();
    };

    // FIX: Correctly determine approval status based on item type.
    let isApproved = false;
    if (item) {
        if (isMockup && currentImage) {
            isApproved = (item as FeedbackMockup).approvedImageIds?.includes(currentImage.id) || false;
        } else if (isVideo && currentVideoAsset) {
            isApproved = (item as FeedbackVideo).approvedVideoIds?.includes(currentVideoAsset.id) || false;
        } else if (isWebsite) {
            isApproved = (item as FeedbackWebsite).isApproved || false;
        }
    }


    if (!item) return <div className="text-center p-10">Feedback item not found.</div>;

    const currentImageUrl = isMockup ? currentImage?.url : undefined;
    // FIX: Use currentVideoAsset for video source URL.
    const currentVideoUrl = isVideo ? currentVideoAsset?.url : undefined;

    const ToolbarButton = ({ Icon, tooltip, onClick, isActive = false }: { Icon: React.FC<any>, tooltip: string, onClick: () => void, isActive?: boolean}) => (
        <div className="relative group">
            <button onClick={onClick} className={`p-3 rounded-lg transition-colors ${isActive ? 'bg-primary text-background' : 'bg-glass-light text-text-secondary hover:text-text-primary'}`}>
                <Icon className="w-5 h-5"/>
            </button>
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-background text-text-primary text-xs font-semibold rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30">
                {tooltip}
            </div>
        </div>
    );

    const contentStyle: React.CSSProperties = {
        transform: `scale(${zoom})`,
        transformOrigin: 'center',
    };

    if (isWebsite) {
        Object.assign(contentStyle, {
            width: deviceDimensions[deviceView].width,
            height: deviceDimensions[deviceView].height,
            ...(deviceView !== 'desktop' && {
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                border: '8px solid #111',
                borderRadius: '16px',
                overflow: 'hidden'
            })
        });
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <div className="flex items-center gap-4">
                     <h1 className="text-2xl font-bold text-text-primary mt-2 truncate">{item.name} {currentImage && `> ${currentImage.name}`} {currentVideoAsset && `> ${currentVideoAsset.name}`}</h1>
                     <button onClick={handleToggleApproval} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${isApproved ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30' : 'bg-glass hover:bg-glass-light text-text-secondary'}`}>
                        <CheckCircleIcon className={`w-5 h-5 ${isApproved ? 'text-green-400' : ''}`}/> {isApproved ? 'Approved' : 'Approve'}
                    </button>
                </div>
                 <div className="flex items-center gap-2">
                    {isWebsite && (
                        <div className="flex items-center bg-glass rounded-lg p-1 border border-border-color">
                            {(['desktop', 'notebook', 'tablet', 'phone'] as DeviceView[]).map(view => (
                                <button
                                    key={view}
                                    onClick={() => setDeviceView(view)}
                                    className={`px-3 py-1 text-sm font-medium rounded-md capitalize transition-colors ${deviceView === view ? 'bg-primary text-background' : 'text-text-secondary hover:bg-glass-light'}`}
                                >
                                    {view}
                                </button>
                            ))}
                        </div>
                    )}
                    <button onClick={() => setZoom(fitZoom)} className="p-2 bg-glass rounded-lg hover:bg-glass-light text-sm font-semibold w-20 text-center" title="Fit to screen">{Math.round(zoom * 100)}%</button>
                    <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="p-2 bg-glass rounded-lg hover:bg-glass-light" title="Zoom out"><ZoomOutIcon className="w-5 h-5"/></button>
                    <button onClick={() => setZoom(z => Math.min(5, z + 0.1))} className="p-2 bg-glass rounded-lg hover:bg-glass-light" title="Zoom in"><ZoomInIcon className="w-5 h-5"/></button>
                 </div>
            </div>

            <div className={`flex-1 flex gap-4 overflow-hidden ${sidebarPosition === 'bottom' ? 'flex-col' : 'flex-row'}`}>
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    <div ref={viewerContainerRef} className="flex-1 bg-glass rounded-lg border border-border-color overflow-auto flex justify-center items-center p-4 relative gap-4">
                        <div 
                                                        ref={contentRef} 
                                                        onClick={handleContentClick} 
                                                        className={`relative flex-shrink-0 transition-transform ${interactionMode === 'comment' && !isVideo ? 'cursor-crosshair ring-4 ring-green-500/30 rounded-lg' : ''} ${isVideo && isPlacingVideoComment ? 'cursor-crosshair' : ''}`} 
                                                        style={contentStyle}
                                                    >
                                                        {isWebsite && 'url' in item && <iframe ref={iframeRef} src={(item as FeedbackWebsite).url} className={`w-full h-full border-0 bg-white ${interactionMode !== 'navigate' ? 'pointer-events-none' : ''}`} title={item.name} />}
                                                        {isMockup && currentImageUrl && <img ref={imageRef} src={currentImageUrl} alt={item.name} className="max-w-none block" />}
                                                        {/* FIX: Use currentVideoUrl which is derived from the active video asset. */}
                                                        {isVideo && currentVideoUrl && (
                                                            <div className="relative" onClick={handleVideoClick}>
                                                                <video ref={videoRef} src={currentVideoUrl} className="max-w-full max-h-full block" />
                                                                <div className="absolute inset-0 pointer-events-none">
                                                                    {pinsForCurrentView
                                                                        .filter(c => c.x_coordinate !== undefined && c.y_coordinate !== undefined)
                                                                        .map(comment => {
                                                                            const isTimeActive = currentTime >= (comment.startTime ?? -Infinity) && currentTime <= (comment.endTime ?? Infinity);
                                                                            const isCurrentlyActive = comment.id === activeComment?.id || isTimeActive;
                                                                            return (
                                                                                <div 
                                                                                    key={comment.id} 
                                                                                    className={`comment-pin absolute pointer-events-auto z-10 transition-all duration-300 ease-in-out ${isTimeActive ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} 
                                                                                    style={{ left: `${comment.x_coordinate}px`, top: `${comment.y_coordinate}px`, transform: `translate(-50%, -50%) scale(${isCurrentlyActive ? 1.25 : 1})`}}
                                                                                    onClick={(e) => handlePinClick(comment, e)}
                                                                                >
                                                                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-background font-bold text-sm ring-4 cursor-pointer shadow-lg transition-all group-hover:scale-110 ${isCurrentlyActive ? 'ring-white' : 'ring-background/50'} ${comment.status === 'Resolved' ? 'bg-green-500' : 'bg-primary'}`}>
                                                                                        {comment.pin_number}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })
                                                                    }
                                                                </div>
                                                            </div>
                                                        )}
                            
                                                        {(pinsVisible && (isMockup || (isWebsite && interactionMode === 'comment'))) && pinsForCurrentView.map(comment => {
                                                            const isCurrentlyActive = comment.id === activeComment?.id;
                                                            return (
                                                            <div key={comment.id} className="comment-pin absolute group z-10" style={{ left: `${comment.x_coordinate}px`, top: `${comment.y_coordinate}px`, transform: `scale(${1/zoom})` }} onClick={(e) => handlePinClick(comment, e)}>
                                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-background font-bold text-sm ring-4 cursor-pointer shadow-lg transition-transform group-hover:scale-110 ${isCurrentlyActive ? 'ring-white scale-110' : 'ring-background/50'} ${comment.status === 'Resolved' ? 'bg-green-500' : 'bg-primary'}`}>
                                                                    {comment.pin_number}
                                                                </div>
                                                            </div>
                                                            );
                                                        })}
                                                    </div>

                         {isVideo && (
                            <div className="flex-shrink-0 flex flex-col items-center justify-center gap-2">
                                <button onClick={togglePlayPause} title={isPlaying ? 'Pause' : 'Play'} className="h-11 w-11 flex items-center justify-center rounded-xl bg-glass-light text-text-secondary hover:bg-glass-light hover:text-text-primary border border-border-color"><span className="sr-only">{isPlaying ? 'Pause' : 'Play'}</span>{isPlaying ? <PauseIcon className="w-5 h-5"/> : <PlayIcon className="w-5 h-5"/>}</button>
                                <button onClick={handleStop} title="Stop" className="h-11 w-11 flex items-center justify-center rounded-xl bg-glass-light text-text-secondary hover:bg-glass-light hover:text-text-primary border border-border-color"><span className="sr-only">Stop</span><StopIcon className="w-5 h-5"/></button>
                                <div ref={volumeControlRef} className="relative flex flex-col items-center">
                                    <button onClick={() => setIsVolumeOpen(o => !o)} title={isMuted || volume === 0 ? 'Unmute' : 'Mute'} className="h-11 w-11 flex items-center justify-center rounded-xl bg-glass-light text-text-secondary hover:bg-glass-light hover:text-text-primary border border-border-color"><span className="sr-only">{isMuted || volume === 0 ? 'Unmute' : 'Mute'}</span>{isMuted || volume === 0 ? <VolumeOffIcon className="w-5 h-5"/> : <VolumeUpIcon className="w-5 h-5"/>}</button>
                                    {isVolumeOpen && (
                                        <div className="absolute bottom-full mb-3 bg-glass p-3 rounded-xl border border-border-color shadow-lg">
                                            <div className="h-24 w-8 flex justify-center items-center">
                                                <input 
                                                    type="range" 
                                                    min="0" max="1" step="0.05" 
                                                    value={isMuted ? 0 : volume} 
                                                    onChange={handleVolumeChange}
                                                    className="w-24 h-2 accent-primary bg-white/20 rounded-full appearance-none cursor-pointer -rotate-90"
                                                    aria-label="Volume"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div ref={speedControlRef} className="relative flex flex-col items-center">
                                     <button onClick={() => setIsSpeedOpen(o => !o)} title="Playback speed" className="h-11 w-11 flex items-center justify-center rounded-xl bg-glass-light text-text-secondary hover:bg-glass-light hover:text-text-primary border border-border-color text-sm font-semibold">{playbackRate}x</button>
                                     {isSpeedOpen && (
                                        <div className="absolute bottom-full mb-3 bg-glass p-2 rounded-xl border border-border-color shadow-lg flex flex-col gap-1">
                                            {[0.5, 1, 1.5, 2].map(rate => 
                                                <button key={rate} onClick={() => handlePlaybackRateChange(rate)} className={`px-4 py-1.5 text-sm font-medium rounded-md ${playbackRate === rate ? 'bg-primary text-background' : 'hover:bg-glass-light'}`}>{rate}x</button>
                                            )}
                                        </div>
                                     )}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {isVideo && duration > 0 && (
                         <div ref={timelineRef} className="flex-shrink-0 bg-glass py-2 rounded-lg border border-border-color">
                            <div className="relative h-8 flex items-center mx-4" >
                                 <div 
                                    className="relative h-4 w-full bg-surface rounded-full cursor-pointer group"
                                    onClick={(e) => {
                                        if(videoRef.current && timelineRef.current) {
                                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                            const clickX = e.clientX - rect.left;
                                            videoRef.current.currentTime = (clickX / rect.width) * duration;
                                        }
                                    }}
                                 >
                                    <div className="absolute top-1/2 -translate-y-1/2 h-2 w-full bg-surface-light rounded-full overflow-hidden">
                                        <div className="absolute h-full bg-yellow-800/80" style={{ width: `${(buffered / duration) * 100}%` }}>
                                            <div className="h-full bg-yellow-600/90"></div>
                                        </div>
                                        <div className="absolute h-full bg-primary" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
                                    </div>

                                    {duration > 0 && allCommentsForItem.filter(c => c.targetType === 'video' && c.startTime !== undefined && c.endTime !== undefined && c.videoAssetId === currentVideoAsset?.id).map(comment => {
                                        const left = `${(comment.startTime! / duration) * 100}%`;
                                        const width = `${Math.max(0.5, ((comment.endTime! - comment.startTime!) / duration) * 100)}%`;
                                        return (
                                            <div 
                                                key={comment.id}
                                                className={`absolute -top-1 h-6 rounded-md group ${isEditMode ? 'cursor-move' : ''}`}
                                                style={{ left, width }}
                                                onClick={(e) => { e.stopPropagation(); onCommentClick(comment); }}
                                                onMouseDown={(e) => isEditMode && handleTimelineDragStart(e, comment.id, 'move')}
                                            >
                                                <div className={`h-full w-full rounded-md border-2 ${activeComment?.id === comment.id ? 'bg-primary border-white' : 'bg-yellow-400/50 border-yellow-400/80 group-hover:bg-yellow-400'}`}>
                                                    {isEditMode && <div onMouseDown={(e) => handleTimelineDragStart(e, comment.id, 'start')} className="absolute -left-1.5 -top-1.5 -bottom-1.5 w-3 cursor-ew-resize"></div>}
                                                    {isEditMode && <div onMouseDown={(e) => handleTimelineDragStart(e, comment.id, 'end')} className="absolute -right-1.5 -top-1.5 -bottom-1.5 w-3 cursor-ew-resize"></div>}
                                                </div>
                                            </div>
                                        )
                                    })}
                                 </div>
                            </div>
                        </div>
                    )}
                </div>

                {sidebarView && (
                    <FeedbackSidebar
                        view={sidebarView}
                        onViewChange={setSidebarView}
                        comments={allCommentsForItem}
                        onCommentClick={onCommentClick}
                        onClose={() => setSidebarView(null)}
                        onNavigate={navigateToPage}
                        onDelete={handleDeleteComment}
                        onResolve={handleResolveComment}
                        onUpdate={handleUpdateComment}
                        position={sidebarPosition}
                        users={data.users}
                        currentUserId="user-1"
                    />
                )}
            </div>
            
            {(activeComment || newCommentCoords || isAddingComment) && (
                <CommentPopover 
                    comment={activeComment}
                    coords={(isMockup || isWebsite || (isVideo && newCommentCoords)) ? (activeComment ? { x: activeComment.x_coordinate!, y: activeComment.y_coordinate! } : newCommentCoords) : null}
                    contentRef={contentRef}
                    zoom={zoom}
                    onClose={handleClosePopover}
                    onSubmit={handleCommentSubmit}
                    onUpdate={handleUpdateComment}
                    onResolve={handleResolveComment}
                    onDelete={handleDeleteComment}
                    targetType={itemType}
                    videoCurrentTime={isVideo && isAddingComment ? videoRef.current?.currentTime : undefined}
                />
            )}
            
            <div className="flex justify-center items-center gap-4 mt-4 flex-shrink-0">
                <div className="p-2 bg-glass border border-border-color rounded-xl flex items-center gap-2 shadow-lg">
                    <ToolbarButton tooltip={sidebarPosition === 'right' ? "Dock to Bottom" : "Dock to Side"} Icon={sidebarPosition === 'right' ? CommentsIcon : ActivityIcon} onClick={() => setSidebarPosition(p => p === 'right' ? 'bottom' : 'right')} />
                    <div className="w-px h-6 bg-border-color"></div>
                    <ToolbarButton tooltip="Comments" Icon={CommentsIcon} onClick={() => setSidebarView(v => v === 'comments' ? null : 'comments')} isActive={sidebarView === 'comments'} />
                    <ToolbarButton tooltip="Activity" Icon={ActivityIcon} onClick={() => setSidebarView(v => v === 'activity' ? null : 'activity')} isActive={sidebarView === 'activity'} />
                    {isMockup && <ToolbarButton tooltip="Grid View" Icon={GridViewIcon} onClick={() => navigate(`/feedback/${projectId}/mockups/${itemId}`)}/>}
                    {isVideo && <ToolbarButton tooltip="Add Comment" Icon={AddIcon} onClick={handleInitiateAddVideoComment} isActive={isPlacingVideoComment}/>}
                    {isWebsite && (
                        <>
                            <ToolbarButton tooltip="Comment Mode" Icon={CommentsIcon} onClick={() => setInteractionMode('comment')} isActive={interactionMode === 'comment'} />
                            <ToolbarButton tooltip="Navigate Mode" Icon={PanIcon} onClick={() => setInteractionMode('navigate')} isActive={interactionMode === 'navigate'} />
                        </>
                    )}
                     <ToolbarButton tooltip={pinsVisible ? "Hide Pins" : "Show Pins"} Icon={pinsVisible ? EyeIcon : EyeOffIcon} onClick={() => setPinsVisible(v => !v)} />
                     {isVideo && <ToolbarButton tooltip={isEditMode ? "Finish Editing" : "Edit Timeline"} Icon={EditIcon} onClick={() => setIsEditMode(e => !e)} isActive={isEditMode} />}
                </div>
            </div>
        </div>
    );
};

export default FeedbackItemPage;