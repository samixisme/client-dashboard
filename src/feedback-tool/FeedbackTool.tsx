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
  
  // Auth
  const userId = auth.currentUser?.uid || 'guest-user';

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

  // Filter comments by device
  const visibleComments = useMemo(() => {
      return comments.filter(c => !c.device || c.device === device);
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

  // Handle Hover
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isCommenting || interactionMode === 'navigate') {
        if (hoveredElement) setHoveredElement(null);
        return;
    }
    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
    if (target && !target.closest('#client-dashboard-feedback-tool')) {
        setHoveredElement(target);
    } else {
        setHoveredElement(null);
    }
  }, [isCommenting, interactionMode, hoveredElement]);

  useEffect(() => {
    if (isCommenting && interactionMode === 'comment') {
        document.addEventListener('mousemove', handleMouseMove);
        document.body.style.cursor = 'crosshair';
    } else {
        document.removeEventListener('mousemove', handleMouseMove);
        document.body.style.cursor = 'default';
        setHoveredElement(null);
    }
    return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.body.style.cursor = 'default';
    };
  }, [isCommenting, interactionMode, handleMouseMove]);

  // Handle Click to Comment
  const handlePageClick = useCallback((e: MouseEvent) => {
    if (!isCommenting || !projectId || !feedbackItemId || interactionMode === 'navigate') return;

    const target = e.target as HTMLElement;
    if (target.closest('#client-dashboard-feedback-tool')) return;

    // Prevent default browser behavior (jumping)
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
    // Do NOT disable commenting mode after one click, let user continue? 
    // Usually tools stay in comment mode until toggled off.
    // But for now, let's keep it active.
    // setIsCommenting(false); 
  }, [isCommenting, projectId, feedbackItemId, interactionMode]);

  useEffect(() => {
    if (isCommenting && interactionMode === 'comment') {
        // Capture phase to intercept before other handlers
        document.addEventListener('click', handlePageClick, true);
    } else {
        document.removeEventListener('click', handlePageClick, true);
    }
    return () => document.removeEventListener('click', handlePageClick, true);
  }, [isCommenting, interactionMode, handlePageClick]);


  // Popover Actions
  const handlePopoverSubmit = async (text: string, details?: { dueDate?: string }) => {
      if (!projectId || !feedbackItemId) return;
      
      try {
          if (popover.isNew) {
               const existingPinsOnPageAndDevice = comments.filter(
                   (c) => c.pageUrl === window.location.pathname && c.device === device
               );
               const maxPinNumber = existingPinsOnPageAndDevice.reduce((max, p) => Math.max(max, p.pin_number || 0), 0);

               const commentId = await addComment(projectId, feedbackItemId, {
                   authorId: userId,
                   commentText: text,
                   x_coordinate: popover.x,
                   y_coordinate: popover.y,
                   pin_number: maxPinNumber + 1, 
                   pageUrl: window.location.pathname,
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
        {/* Highlight Overlay */}
        {hoveredElement && isCommenting && interactionMode === 'comment' && (
            <div 
                style={{
                    position: 'absolute',
                    top: hoveredElement.getBoundingClientRect().top + window.scrollY,
                    left: hoveredElement.getBoundingClientRect().left + window.scrollX,
                    width: hoveredElement.getBoundingClientRect().width,
                    height: hoveredElement.getBoundingClientRect().height,
                    border: '2px solid #3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    pointerEvents: 'none',
                    zIndex: 2147483646
                }}
            />
        )}

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
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-lg cursor-pointer transition-transform hover:scale-110 ${isResolved ? 'bg-green-500' : 'bg-blue-600'}`}
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
                    comment={popover.comment ? {
                        id: popover.comment.id,
                        projectId: projectId || '',
                        targetId: feedbackItemId || '',
                        targetType: 'website',
                        comment: popover.comment.commentText,
                        reporterId: popover.comment.authorId,
                        status: popover.comment.status || 'Active',
                        timestamp: typeof popover.comment.createdAt === 'string' ? popover.comment.createdAt : new Date().toISOString(),
                        pin_number: popover.comment.pin_number || 0,
                        dueDate: popover.comment.dueDate,
                        replies: popover.comment.replies
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
                />
            </div>
        )}
    </div>
  );
};

export default FeedbackTool;