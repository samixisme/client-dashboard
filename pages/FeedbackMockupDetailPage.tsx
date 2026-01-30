
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getFeedbackItem, subscribeToComments, addComment, toggleCommentResolved, updateFeedbackItemStatus, deleteComment, updateComment } from '../utils/feedbackUtils';
import { FeedbackItem, FeedbackItemComment, User, FeedbackComment } from '../types';
import { useData } from '../contexts/DataContext';
import FeedbackSidebar from '../components/feedback/FeedbackSidebar';
import CommentPopover from '../components/feedback/CommentPopover';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { ArrowRightIcon } from '../components/icons/ArrowRightIcon';
import { ZoomInIcon } from '../components/icons/ZoomInIcon';
import { ZoomOutIcon } from '../components/icons/ZoomOutIcon';
import { EyeIcon } from '../components/icons/EyeIcon';
import { EyeOffIcon } from '../components/icons/EyeOffIcon';
import { PanIcon } from '../components/icons/PanIcon';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import { LinkIcon } from '../components/icons/LinkIcon';
import { GridViewIcon } from '../components/icons/GridViewIcon';
import { CommentsIcon } from '../components/icons/CommentsIcon';
import { ActivityIcon } from '../components/icons/ActivityIcon';

const FeedbackMockupDetailPage = () => {
  const { projectId, feedbackItemId } = useParams<{ projectId: string; feedbackItemId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useData();

  // Data State
  const [feedbackItem, setFeedbackItem] = useState<FeedbackItem | null>(null);
  const [comments, setComments] = useState<FeedbackItemComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const path = searchParams.get('path');
  const activeImageUrl = (path && feedbackItem) ? path : feedbackItem?.assetUrl;

  // Viewer State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [pinsVisible, setPinsVisible] = useState(true);
  const [activePinId, setActivePinId] = useState<string | null>(null);

  // Interaction State
  const [clickPosition, setClickPosition] = useState<{ x: number, y: number } | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  
  // Popover State
  const [popover, setPopover] = useState<{
      isOpen: boolean;
      position: { x: number; y: number } | null;
      comment: FeedbackItemComment | null;
  }>({ isOpen: false, position: null, comment: null });
  
  // Sidebar Configuration State
  const [sidebarView, setSidebarView] = useState<'comments' | 'activity'>('comments');
  const [sidebarPosition, setSidebarPosition] = useState<'right' | 'bottom'>('right');

  // Refs
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // 1. Data Fetching
  useEffect(() => {
    if (projectId && feedbackItemId) {
      getFeedbackItem(projectId, feedbackItemId).then((item) => {
        setFeedbackItem(item);
        setLoading(false);
      });

      const unsubscribe = subscribeToComments(projectId, feedbackItemId, (fetchedComments) => {
        setComments(fetchedComments);
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

  // Set current user ID
  useEffect(() => {
    if (user?.uid) {
      setCurrentUserId(user.uid);
    }
  }, [user]);

  // 2. Keyboard Events (Spacebar for Panning)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !(e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement)) {
        e.preventDefault(); // Prevent scrolling
        setIsSpaceHeld(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceHeld(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // 3. Mouse Event Handlers (Panning & Pinning)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isSpaceHeld || isPanning) {
      isDragging.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleImageClick = (e: React.MouseEvent) => {
    // Only drop pin if not panning/dragging
    if (isSpaceHeld || isPanning || isDragging.current) return;
    if (!imageRef.current) return;

    // Calculate percentage coordinates relative to image natural size
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setClickPosition({ x, y });
    setNewCommentText('');
    setIsSidebarOpen(true);
    setSidebarView('comments'); // Switch to comments view to show the form
    setActivePinId(null); // Deselect existing
  };

  // 4. Pin & Sidebar Interactions
  const handleCommentClick = (comment: FeedbackItemComment) => {
    setActivePinId(comment.id);
    setClickPosition(null); // Cancel new comment mode
    // Open popover with the comment
    if (comment.position) {
      setPopover({
        isOpen: true,
        position: comment.position,
        comment: comment
      });
    }
  };

  const handleClosePopover = () => {
    setPopover({ isOpen: false, position: null, comment: null });
    setActivePinId(null);
  };

  const handleUpdateComment = async (commentId: string, updates: Partial<FeedbackItemComment>) => {
    if (!projectId || !feedbackItemId) return;
    try {
      await updateComment(projectId, feedbackItemId, commentId, updates);
    } catch (error) {
      console.error("Error updating comment:", error);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !projectId || !feedbackItemId || !user || !clickPosition) return;

    try {
      const authorId = user.uid || currentUserId || 'guest-user';
      if (!authorId) return;

      await addComment(projectId, feedbackItemId, {
        authorId: authorId, 
        commentText: newCommentText,
        position: clickPosition
      });
      setNewCommentText('');
      setClickPosition(null);
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  // NEW: Robust Delete Handler passed to Sidebar
  const handleDeleteComment = async (commentId: string) => {
      if (!projectId || !feedbackItemId) return;
      try {
          await deleteComment(projectId, feedbackItemId, commentId, currentUserId);
          // Optimistic update handled by listener or we can manually filter if needed, 
          // but listener is safer. The listener in useEffect will update 'comments'.
      } catch (error) {
          console.error("Failed to delete comment:", error);
      }
  };

  const handleResolveComment = async (commentId: string) => {
      if (!projectId || !feedbackItemId) return;
      const comment = comments.find(c => c.id === commentId);
      if (comment) {
          await toggleCommentResolved(projectId, feedbackItemId, commentId, comment.resolved, currentUserId);
      }
  }

  const handleFitToScreen = () => {
      setZoom(1);
      setPan({ x: 0, y: 0 });
  };

  // 5. Global Actions
  const handleApprove = async () => {
      if (!projectId || !feedbackItemId) return;
      const newStatus = feedbackItem?.status === 'approved' ? 'in_review' : 'approved';
      await updateFeedbackItemStatus(projectId, feedbackItemId, newStatus);
      setFeedbackItem(prev => prev ? ({ ...prev, status: newStatus }) : null);
  };

  const handleDownload = () => {
      if (activeImageUrl) {
          window.open(activeImageUrl, '_blank');
      }
  };

  const handleShare = () => {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
  };

  if (loading) return <div className="p-10 text-center text-text-secondary">Loading...</div>;
  if (!feedbackItem) return <div className="p-10 text-center text-text-secondary">Mockup Not Found</div>;

  return (
    <div className={`flex overflow-hidden relative ${sidebarPosition === 'bottom' ? 'flex-col h-[calc(100vh-100px)]' : 'flex-row h-[calc(100vh-100px)]'}`}>
      
      {/* 1. Main Viewer Area */}
      <div 
        ref={containerRef}
        className={`flex-1 bg-background relative overflow-hidden select-none ${(isSpaceHeld || isPanning) ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={(e) => {
             if (e.ctrlKey) {
                 e.preventDefault();
                 setZoom(z => Math.max(0.1, Math.min(5, z - e.deltaY * 0.01)));
             }
        }}
      >
        {/* Top Header Overlay (Title & Actions) */}
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start pointer-events-none">
             {/* Left: Breadcrumbs/Title */}
             <div className="bg-surface/90 backdrop-blur-md border border-border-color p-2 rounded-lg shadow-sm pointer-events-auto flex items-center gap-3">
                 <button onClick={() => navigate(`/feedback/${projectId}/mockups`)} className="p-1.5 hover:bg-surface-light rounded-md text-text-secondary hover:text-text-primary transition-colors" title="Back to Grid">
                     <GridViewIcon className="w-5 h-5"/>
                 </button>
                 <div className="h-4 w-px bg-border-color"></div>
                 <div>
                     <h1 className="text-sm font-bold text-text-primary leading-tight">{feedbackItem.name}</h1>
                     <p className="text-[10px] text-text-secondary">V1 • {new Date(feedbackItem.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                 </div>
             </div>

             {/* Right: Actions */}
             <div className="flex gap-2 pointer-events-auto">
                 <button onClick={handleApprove} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all ${feedbackItem.status === 'approved' ? 'bg-green-500 text-black hover:bg-green-600' : 'bg-surface text-text-secondary hover:text-text-primary border border-border-color'}`}>
                     <CheckCircleIcon className="w-5 h-5"/>
                     {feedbackItem.status === 'approved' ? 'Approved' : 'Approve'}
                 </button>
                 <button onClick={handleShare} className="p-2 bg-surface/90 backdrop-blur-md rounded-lg text-text-secondary hover:text-primary hover:bg-surface-light border border-border-color shadow-sm" title="Share Link">
                     <LinkIcon className="w-5 h-5"/>
                 </button>
                 <button onClick={handleDownload} className="p-2 bg-surface/90 backdrop-blur-md rounded-lg text-text-secondary hover:text-primary hover:bg-surface-light border border-border-color shadow-sm" title="Download Original">
                     <DownloadIcon className="w-5 h-5"/>
                 </button>
                 <button onClick={() => setSidebarPosition(p => p === 'right' ? 'bottom' : 'right')} className="p-2 bg-surface/90 backdrop-blur-md rounded-lg text-text-secondary hover:text-primary hover:bg-surface-light border border-border-color shadow-sm hidden md:block" title="Dock Sidebar">
                     <div className={`w-4 h-4 border-2 border-current ${sidebarPosition === 'right' ? 'border-b-transparent' : 'border-r-transparent'}`}></div>
                 </button>
             </div>
        </div>

        {/* Transform Container */}
        <div 
            style={{ 
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isDragging.current ? 'none' : 'transform 0.1s ease-out'
            }}
            className="w-full h-full flex items-center justify-center"
        >
            <div className="relative inline-block shadow-2xl">
                <img 
                    ref={imageRef}
                    src={activeImageUrl} 
                    alt={feedbackItem.name}
                    draggable={false}
                    onClick={handleImageClick}
                    className={`max-w-none block pointer-events-auto ${(isSpaceHeld || isPanning) ? '' : 'cursor-crosshair'}`}
                    style={{ maxHeight: 'none', maxWidth: 'none' }} // Allow growing beyond bounds
                />

                {/* Pins Overlay */}
                {pinsVisible && comments.map((comment, index) => (
                    comment.position && !comment.resolved && (
                        <div
                            key={comment.id}
                            className={`absolute flex items-center justify-center rounded-full font-bold text-black shadow-md border-2 border-black transition-transform hover:scale-125 hover:z-50 cursor-pointer
                                ${activePinId === comment.id ? 'bg-primary z-40 scale-125' : 'bg-primary/80 z-30'}
                            `}
                            style={{
                                left: `${comment.position.x}%`,
                                top: `${comment.position.y}%`,
                                width: '32px',
                                height: '32px',
                                fontSize: '14px',
                                transform: `translate(-50%, -50%) scale(${1 / zoom})` // Counter-scale
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCommentClick(comment);
                                setIsSidebarOpen(true);
                                setSidebarView('comments');
                            }}
                        >
                            {index + 1}
                        </div>
                    )
                ))}

                {/* New Comment Indicator */}
                {clickPosition && (
                    <div 
                        className="absolute w-8 h-8 rounded-full bg-surface border-2 border-primary text-primary flex items-center justify-center font-bold shadow-lg animate-bounce z-50"
                        style={{
                            left: `${clickPosition.x}%`,
                            top: `${clickPosition.y}%`,
                            transform: `translate(-50%, -50%) scale(${1 / zoom})`
                        }}
                    >
                        +
                    </div>
                )}
            </div>
        </div>

        {/* Toolbar Overlay */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-surface/90 backdrop-blur-xl border border-border-color rounded-2xl p-1.5 flex items-center gap-2 shadow-2xl z-50 ring-1 ring-black/5">
             {/* Zoom Controls with Slider */}
             <button onClick={() => setZoom(z => Math.max(0.1, z - 0.25))} className="p-2 hover:bg-surface-light rounded-xl text-text-secondary hover:text-text-primary transition-colors" title="Zoom Out"><ZoomOutIcon className="w-5 h-5"/></button>
             <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={Math.round(zoom * 100)}
                onChange={(e) => setZoom(parseInt(e.target.value) / 100)}
                className="w-24 h-1.5 bg-border-color rounded-full appearance-none cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
                title={`Zoom: ${Math.round(zoom * 100)}%`}
             />
             <button onClick={() => setZoom(z => Math.min(5, z + 0.25))} className="p-2 hover:bg-surface-light rounded-xl text-text-secondary hover:text-text-primary transition-colors" title="Zoom In"><ZoomInIcon className="w-5 h-5"/></button>
             <span className="text-xs font-bold font-mono w-12 text-center text-text-primary">{Math.round(zoom * 100)}%</span>
             <div className="w-px h-5 bg-border-color/50 mx-1"></div>
             <button onClick={handleFitToScreen} className="px-3 py-1.5 text-xs font-bold hover:bg-surface-light rounded-xl text-text-primary transition-colors">Fit</button>
             <div className="w-px h-5 bg-border-color/50 mx-1"></div>
             <button onClick={() => setIsPanning(!isPanning)} className={`p-2 rounded-xl transition-colors ${isPanning ? 'bg-primary text-black font-bold shadow-sm' : 'hover:bg-surface-light text-text-secondary'}`} title="Pan Tool"><PanIcon className="w-5 h-5"/></button>
             <button onClick={() => setPinsVisible(!pinsVisible)} className={`p-2 rounded-xl transition-colors ${!pinsVisible ? 'text-text-secondary opacity-50' : 'text-primary hover:bg-surface-light'}`} title="Toggle Pins">{pinsVisible ? <EyeIcon className="w-5 h-5"/> : <EyeOffIcon className="w-5 h-5"/>}</button>
        </div>
      </div>

      {/* Toggle Sidebar Button (When Closed) */}
      {!isSidebarOpen && (
        <button 
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-1/2 right-0 transform -translate-y-1/2 z-50 p-2 bg-surface shadow-lg rounded-l-xl text-text-primary hover:text-primary transition-all border border-r-0 border-border-color"
        >
            <ArrowRightIcon className="w-5 h-5 transform rotate-180"/>
        </button>
      )}

      {/* 2. Sidebar Area */}
      <div className={`${isSidebarOpen ? (sidebarPosition === 'right' ? 'w-96 border-l' : 'h-80 w-full border-t') : 'w-0 h-0 opacity-0'} transition-all duration-300 ease-in-out bg-surface border-border-color flex flex-col overflow-hidden relative shadow-2xl z-20`}>
         {/* Sidebar Header */}
         <div className="p-4 border-b border-border-color bg-surface flex justify-between items-center flex-shrink-0">
             <div className="flex gap-4">
                 <button 
                    onClick={() => setSidebarView('comments')}
                    className={`pb-1 text-sm font-bold border-b-2 transition-colors ${sidebarView === 'comments' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                 >
                     Comments
                 </button>
                 <button 
                    onClick={() => setSidebarView('activity')}
                    className={`pb-1 text-sm font-bold border-b-2 transition-colors ${sidebarView === 'activity' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                 >
                     Activity
                 </button>
             </div>
             <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-surface-light rounded text-text-secondary transition-colors">
                 <ArrowRightIcon className={`w-5 h-5 ${sidebarPosition === 'bottom' ? 'rotate-90' : ''}`}/>
             </button>
         </div>

         {/* New Comment Form (Only in Comments View) */}
         {clickPosition && sidebarView === 'comments' && (
             <div className="p-4 bg-primary/5 border-b border-primary/20 flex-shrink-0 animate-in slide-in-from-right duration-200">
                 <div className="flex justify-between items-center mb-2">
                     <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                         <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div> New Pin
                     </span>
                     <button onClick={() => setClickPosition(null)} className="text-xs text-text-secondary hover:text-text-primary underline">Cancel</button>
                 </div>
                 <form onSubmit={handleSubmitComment}>
                     <textarea 
                        className="w-full bg-surface-light border border-border-color rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none mb-3 resize-none shadow-sm text-text-primary placeholder:text-text-secondary"
                        rows={3}
                        placeholder="What's your feedback?"
                        value={newCommentText}
                        onChange={e => setNewCommentText(e.target.value)}
                        autoFocus
                     />
                     <button type="submit" className="w-full bg-primary text-black py-2 rounded-lg text-sm font-bold hover:bg-primary-hover transition-colors shadow-sm">
                         Post Comment
                     </button>
                 </form>
             </div>
         )}

         {/* Comments/Activity List */}
         <div className="flex-1 overflow-hidden flex flex-col bg-surface/50">
            <FeedbackSidebar 
                view={sidebarView}
                onViewChange={setSidebarView}
                comments={comments}
                onCommentClick={handleCommentClick}
                onClose={() => setIsSidebarOpen(false)}
                onDelete={handleDeleteComment}
                onResolve={handleResolveComment}
                onUpdate={handleUpdateComment}
                position={sidebarPosition}
                users={users}
                currentUserId={currentUserId}
            />
         </div>
      </div>

      {/* Comment Popover */}
      {popover.isOpen && popover.comment && containerRef.current && (() => {
        // Convert FeedbackItemComment to FeedbackComment format for CommentPopover
        const adaptedComment: FeedbackComment = {
          id: popover.comment.id,
          projectId: projectId || '',
          targetId: feedbackItemId || '',
          targetType: 'mockup',
          comment: popover.comment.commentText,
          reporterId: popover.comment.authorId,
          x_coordinate: popover.comment.position?.x,
          y_coordinate: popover.comment.position?.y,
          status: popover.comment.resolved ? 'Resolved' : 'Active',
          timestamp: popover.comment.createdAt?.seconds
            ? new Date(popover.comment.createdAt.seconds * 1000).toISOString()
            : new Date().toISOString(),
          pin_number: popover.comment.pin_number || comments.findIndex(c => c.id === popover.comment?.id) + 1,
          dueDate: popover.comment.dueDate,
          replies: popover.comment.replies
        };

        const handleUpdateCommentAdapter = async (commentId: string, updates: Partial<FeedbackComment>) => {
          // Convert FeedbackComment updates to FeedbackItemComment updates
          const itemCommentUpdates: Partial<FeedbackItemComment> = {
            commentText: updates.comment,
            resolved: updates.status === 'Resolved',
            dueDate: updates.dueDate,
            replies: updates.replies
          };
          await handleUpdateComment(commentId, itemCommentUpdates);
        };

        return (
          <CommentPopover
            comment={adaptedComment}
            coords={popover.position}
            contentRef={containerRef}
            zoom={zoom}
            onClose={handleClosePopover}
            onSubmit={() => {}} // Not used for existing comments
            onUpdate={handleUpdateCommentAdapter}
            onResolve={() => handleResolveComment(popover.comment!.id)}
            onDelete={() => {
              handleDeleteComment(popover.comment!.id);
              handleClosePopover();
            }}
            targetType="mockup"
            users={users}
            currentUserId={currentUserId}
          />
        );
      })()}
    </div>
  );
};

export default FeedbackMockupDetailPage;
