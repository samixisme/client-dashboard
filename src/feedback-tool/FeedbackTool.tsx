import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import CommentPopover from '../../components/feedback/CommentPopover';
import { subscribeToComments, addComment, deleteComment, updateComment, syncCommentToCalendar } from '../../utils/feedbackUtils';
import { FeedbackItemComment, FeedbackComment, User } from '../../types';
import { db, auth } from '../../utils/firebase';
import { collection, getDocs } from 'firebase/firestore'; 

interface Pin {
  id: string;
  x: number;
  y: number;
  number: number;
}

const FeedbackTool = () => {
  console.log("FeedbackTool: Mounting..."); 

  const [projectId, setProjectId] = useState<string | null>(null);
  const [feedbackItemId, setFeedbackItemId] = useState<string | null>(null);
  const [comments, setComments] = useState<FeedbackItemComment[]>([]);
  const [isCommenting, setIsCommenting] = useState(false);
  const [users, setUsers] = useState<User[]>([]); 
  
  // State from Host
  const [device, setDevice] = useState<string>('desktop');
  const [interactionMode, setInteractionMode] = useState<string>('comment');

  // Popover State
  const [popover, setPopover] = useState<{
      isOpen: boolean;
      x: number;
      y: number;
      comment?: FeedbackItemComment; 
      isNew?: boolean;
  }>({ isOpen: false, x: 0, y: 0 });

  const contentRef = useRef<HTMLDivElement>(null); 
  
  // Highlighting
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  
  // Auth State
  const [userId, setUserId] = useState<string>(auth.currentUser?.uid || '');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("FeedbackTool: User authenticated", user.uid);
            setUserId(user.uid);
        } else {
            console.log("FeedbackTool: User not authenticated");
            setUserId('guest-user'); 
        }
    });
    return () => unsubscribe();
  }, []);

  // Read config from script tag
  useEffect(() => {
    const script = document.querySelector('script[src*="feedback.js"]');
    if (script) {
      const pid = script.getAttribute('data-project-id');
      const fid = script.getAttribute('data-feedback-id');
      console.log("FeedbackTool: Config found", { pid, fid });
      setProjectId(pid);
      setFeedbackItemId(fid);
    } else {
        const scriptModule = document.querySelector('script[data-project-id]');
         if (scriptModule) {
            const pid = scriptModule.getAttribute('data-project-id');
            const fid = scriptModule.getAttribute('data-feedback-id');
            console.log("FeedbackTool: Config found (module)", { pid, fid });
            setProjectId(pid);
            setFeedbackItemId(fid);
        } else {
            console.warn("FeedbackTool: Script tag not found or missing attributes");
        }
    }
  }, []);

  // Fetch Users
  useEffect(() => {
    const fetchUsers = async () => {
        try {
            console.log("FeedbackTool: Fetching users...");
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const fetchedUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            console.log("FeedbackTool: Users fetched", fetchedUsers.length);
            setUsers(fetchedUsers);
        } catch (error) {
            console.error("FeedbackTool: Error fetching users:", error);
        }
    };
    
    fetchUsers();
  }, []);

  // Subscribe to comments
  useEffect(() => {
    if (!projectId || !feedbackItemId) return;
    
    console.log("FeedbackTool: Subscribing to comments...");
    const unsubscribeComments = subscribeToComments(projectId, feedbackItemId, (newComments) => {
      console.log("FeedbackTool: Comments updated", newComments.length);
      setComments(newComments);
    });

    return () => {
        unsubscribeComments();
    };
  }, [projectId, feedbackItemId]);

  // Listen for messages from Host
  useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
           if (event.data?.type === 'FEEDBACK_TOOL_UPDATE') {
               console.log("FeedbackTool: Received update", event.data.payload);
               if (event.data.payload.device) setDevice(event.data.payload.device);
               if (event.data.payload.interactionMode) {
                   setInteractionMode(event.data.payload.interactionMode);
                   setIsCommenting(event.data.payload.interactionMode === 'comment');
               }
           }
           if (event.data?.type === 'SCROLL_TO_PIN') {
               const { x, y, commentId } = event.data.payload;
               window.scrollTo({
                   top: y - window.innerHeight / 2,
                   behavior: 'smooth'
               });
               
               if (commentId) {
                   const comment = comments.find(c => c.id === commentId);
                   if (comment) {
                       setPopover({
                           isOpen: true,
                           x: comment.x_coordinate || x,
                           y: comment.y_coordinate || y,
                           comment: comment,
                           isNew: false
                       });
                   }
               }
           }
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
  }, [comments]); // Added comments to dependency so we can find the comment

  // Helper to get real URL
  const getCurrentRealUrl = () => {
       const params = new URLSearchParams(window.location.search);
       // Normalize: remove trailing slash for consistency
       const rawUrl = params.get('url') || window.location.href;
       return rawUrl.endsWith('/') && rawUrl.length > 1 ? rawUrl.slice(0, -1) : rawUrl;
  };

  // Filter comments by device and Page URL
  const visibleComments = useMemo(() => {
      const currentUrl = getCurrentRealUrl();
      return comments.filter(c => {
          // Normalize comment URL too
          const commentUrl = c.pageUrl && c.pageUrl.endsWith('/') && c.pageUrl.length > 1 
              ? c.pageUrl.slice(0, -1) 
              : c.pageUrl || '';
              
          // Match device AND page URL
          const deviceMatch = !c.device || c.device === device;
          
          // Using strict equality on normalized URLs. 
          // If old comments have '/api/proxy', they won't match currentUrl (which is real URL), so they will hide. 
          // This effectively cleans up the view for the user automatically.
          const urlMatch = commentUrl === currentUrl;
          
          return deviceMatch && urlMatch;
      });
  }, [comments, device]);

  // Pins
  const pins: Pin[] = useMemo(() => {
      return visibleComments.map((comment, index) => ({
          id: comment.id,
          x: comment.x_coordinate || 0,
          y: comment.y_coordinate || 0,
          number: comment.pin_number || (index + 1)
      }));
  }, [visibleComments]);

  // Handle Click to Comment (via Shield)
  const handleShieldClick = (e: React.MouseEvent) => {
    if (!isCommenting || !projectId || !feedbackItemId || interactionMode === 'navigate') return;

    e.preventDefault();
    e.stopPropagation();

    const x = e.pageX;
    const y = e.pageY;
    
    setPopover({
        isOpen: true,
        x,
        y,
        isNew: true
    });
    // We stay in commenting mode for multiple comments
  };

  // Handle Hover (via Shield)
  const handleShieldMouseMove = (e: React.MouseEvent) => {
     const elements = document.elementsFromPoint(e.clientX, e.clientY);
     // Find the first element that is NOT part of the feedback tool
     const target = elements.find(el => !el.closest('#client-dashboard-feedback-tool')) as HTMLElement;
     
     if (target && target !== hoveredElement) {
         setHoveredElement(target);
     } else if (!target) {
         setHoveredElement(null);
     }
  };


  // Popover Actions
  const handlePopoverSubmit = async (text: string, details?: { dueDate?: string }) => {
      if (!projectId || !feedbackItemId) return;
      
      try {
          if (popover.isNew) {

               // Use consistent URL helper
               const currentRealUrl = getCurrentRealUrl();

               const existingPinsOnPageAndDevice = comments.filter(
                   (c) => c.pageUrl === currentRealUrl && c.device === device
               );
               const maxPinNumber = existingPinsOnPageAndDevice.reduce((max, p) => Math.max(max, p.pin_number || 0), 0);

               const commentId = await addComment(projectId, feedbackItemId, {
                   authorId: userId,
                   commentText: text,
                   x_coordinate: popover.x,
                   y_coordinate: popover.y,
                   pin_number: maxPinNumber + 1, 
                   pageUrl: currentRealUrl,
                   device: device,
                   dueDate: details?.dueDate,
                   status: 'Active', 
                   replies: [] 
               });
               
               if (details?.dueDate) {
                   await syncCommentToCalendar(commentId, text, details.dueDate, userId, projectId);
               }
          } else if (popover.comment) {
              // Handle Reply (implemented in CommentPopover via onUpdate usually)
          }
          setPopover({ isOpen: false, x: 0, y: 0 });
      } catch (err) {
          console.error("Failed to submit comment", err);
          alert("Failed to save comment.");
      }
  };
  
  const handleCommentUpdate = async (commentId: string, updates: Partial<FeedbackComment>) => {
      if (!projectId || !feedbackItemId) return;
      
      const itemUpdates: any = { ...updates };
      if (updates.comment) {
          itemUpdates.commentText = updates.comment;
          delete itemUpdates.comment;
      }

      await updateComment(projectId, feedbackItemId, commentId, itemUpdates);
      if (updates.dueDate) {
          const commentToUpdate = comments.find(c => c.id === commentId);
          if (commentToUpdate && commentToUpdate.commentText) {
            await syncCommentToCalendar(commentId, commentToUpdate.commentText, updates.dueDate, userId, projectId);
          }
      }
  };

  const handleDeleteComment = async (commentId: string) => {
      if (!projectId || !feedbackItemId) return;
      await deleteComment(projectId, feedbackItemId, commentId);
      if (popover.comment?.id === commentId) setPopover({ isOpen: false, x: 0, y: 0 });
  };

  const handleResolveComment = async (commentId: string) => {
      if (!projectId || !feedbackItemId) return;
      const comment = comments.find(c => c.id === commentId);
      if (comment) {
          const newStatus = comment.status === 'Resolved' ? 'Active' : 'Resolved';
          await updateComment(projectId, feedbackItemId, commentId, { status: newStatus, resolved: newStatus === 'Resolved' });
      }
  };

  const handlePinClick = (comment: FeedbackItemComment) => {
     // Notify host to open sidebar and select this comment
     window.parent.postMessage({
         type: 'PIN_CLICKED',
         payload: { commentId: comment.id }
     }, '*');

     if (comment.x_coordinate !== undefined && comment.y_coordinate !== undefined) {
         setPopover({
             isOpen: true,
             x: comment.x_coordinate,
             y: comment.y_coordinate,
             comment: comment,
             isNew: false
         });
     }
  };


  const activeComment = useMemo(() => {
      // If we have an open popover with a specific comment ID, find the latest version in comments prop
      if (!popover.isOpen || !popover.comment) return null;
      // If it's a new comment (draft), strictly use the local state
      if (popover.isNew) return popover.comment;
      // Otherwise, try to find it in the live updates
      return comments.find(c => c.id === popover.comment?.id) || popover.comment;
  }, [popover.isOpen, popover.comment, popover.isNew, comments]);

  if (!projectId || !feedbackItemId) {
      console.log("FeedbackTool: Missing project or feedback ID", { projectId, feedbackItemId });
      return null;
  }

  return (
    <div 
        className="feedback-tool-root font-sans" 
        id="client-dashboard-feedback-tool"
        ref={contentRef}
        style={{ 
            pointerEvents: 'none', 
            position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, zIndex: 2147483647
        }}
    >
        {/* Click Shield - ONLY active when commenting */}
        {isCommenting && interactionMode === 'comment' && (
            <div
                onClick={handleShieldClick}
                onMouseMove={handleShieldMouseMove}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 2147483645, // Below pins/popover (max int) but above everything else
                    cursor: 'crosshair',
                    pointerEvents: 'auto', // Capture clicks
                    background: 'transparent' // Invisible
                }}
            />
        )}
        
        {/* Green Halo */}
        {isCommenting && hoveredElement && (() => {
            const rect = hoveredElement.getBoundingClientRect();
            const docTop = rect.top + window.scrollY;
            const docLeft = rect.left + window.scrollX;
            return (
                <div
                    style={{
                        position: 'absolute',
                        top: docTop,
                        left: docLeft,
                        width: rect.width,
                        height: rect.height,
                        border: '2px solid #A3E635', // Primary Green
                        backgroundColor: 'rgba(163, 230, 53, 0.2)', // Slight fill
                        pointerEvents: 'none',
                        zIndex: 2147483646,
                        transition: 'all 0.1s ease-out'
                    }}
                />
            );
        })()}

        {/* Pins */}
        {pins.map(pin => {
            const comment = comments.find(c => c.id === pin.id);
            if (!comment) return null;
            const isResolved = comment.status === 'Resolved';
            return (
                <div
                    key={pin.id}
                    style={{
                        position: 'absolute',
                        top: pin.y,
                        left: pin.x,
                        zIndex: 2147483647,
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'auto', 
                        opacity: isResolved ? 0.5 : 1
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-black font-bold shadow-lg cursor-pointer transition-transform hover:scale-110 ${isResolved ? 'bg-green-500' : 'bg-[#A3E635]'}`}
                    title={comment.commentText}
                    onClick={(e) => { e.stopPropagation(); handlePinClick(comment); }}
                >
                    {pin.number}
                </div>
            );
        })}

        {/* Popover */}
        {popover.isOpen && (
            <div className="pointer-events-auto" style={{ position: 'relative', zIndex: 2147483647 }}>
                <CommentPopover 
                    comment={activeComment ? {
                        id: activeComment.id,
                        projectId: projectId || '',
                        targetId: feedbackItemId || '',
                        targetType: 'website',
                        comment: activeComment.commentText,
                        reporterId: activeComment.authorId,
                        status: activeComment.status || 'Active',
                        timestamp: typeof activeComment.createdAt === 'string' ? activeComment.createdAt : new Date().toISOString(),
                        pin_number: activeComment.pin_number || 0,
                        dueDate: activeComment.dueDate,
                        replies: activeComment.replies
                    } as FeedbackComment : null}
                    coords={{ x: popover.x, y: popover.y }}
                    contentRef={contentRef}
                    zoom={1}
                    onClose={() => setPopover({ isOpen: false, x: 0, y: 0 })}
                    onSubmit={handlePopoverSubmit}
                    onUpdate={handleCommentUpdate}
                    onResolve={handleResolveComment}
                    onDelete={handleDeleteComment}
                    targetType="website"
                    users={users} 
                    currentUserId={userId}
                />
            </div>
        )}
    </div>
  );
};

export default FeedbackTool;