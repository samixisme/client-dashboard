import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import FeedbackSidebar from '../../components/feedback/FeedbackSidebar';
import CommentPopover from '../../components/feedback/CommentPopover';
import { subscribeToComments, addComment, deleteComment, toggleCommentResolved, updateComment, syncCommentToCalendar } from '../../utils/feedbackUtils';
import { FeedbackItemComment, FeedbackComment } from '../../types';
import { db, auth } from '../../utils/firebase';

// Function to generate a unique CSS selector for an element
const getCssSelector = (el: HTMLElement): string => {
  if (!(el instanceof Element)) return '';
  const path: string[] = [];
  while (el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.nodeName.toLowerCase();
    if (el.id) {
      selector += '#' + el.id;
      path.unshift(selector);
      break;
    } else {
      let sib: Element | null = el;
      let nth = 1;
      while (sib = sib.previousElementSibling) {
        if (sib.nodeName.toLowerCase() === selector) nth++;
      }
      if (nth !== 1) selector += `:nth-of-type(${nth})`;
    }
    path.unshift(selector);
    el = el.parentNode as HTMLElement;
  }
  return path.join(' > ');
};

interface Pin {
  id: string;
  x: number;
  y: number;
  number: number;
}

const FeedbackTool = () => {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [feedbackItemId, setFeedbackItemId] = useState<string | null>(null);
  const [comments, setComments] = useState<FeedbackItemComment[]>([]);
  const [isCommenting, setIsCommenting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarDock, setSidebarDock] = useState<'right' | 'bottom'>('right');
  
  // State from Host
  const [device, setDevice] = useState<string>('desktop');
  const [interactionMode, setInteractionMode] = useState<string>('comment');

  // Popover State
  const [popover, setPopover] = useState<{
      isOpen: boolean;
      x: number;
      y: number;
      comment?: FeedbackItemComment; // If editing/replying/viewing
      isNew?: boolean;
  }>({ isOpen: false, x: 0, y: 0 });

  const contentRef = useRef<HTMLDivElement>(null); // Ref for popover positioning context
  
  // Highlighting
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  
  // Auth
  const userId = auth.currentUser?.uid || 'guest-user';

  // Read config from script tag
  useEffect(() => {
    const script = document.querySelector('script[src*="feedback.js"]');
    if (script) {
      setProjectId(script.getAttribute('data-project-id'));
      setFeedbackItemId(script.getAttribute('data-feedback-id'));
    }
  }, []);

  // Listen for messages from Host
  useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
           if (event.data?.type === 'FEEDBACK_TOOL_UPDATE') {
               if (event.data.payload.device) setDevice(event.data.payload.device);
               if (event.data.payload.interactionMode) setInteractionMode(event.data.payload.interactionMode);
           }
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Subscribe to comments
  useEffect(() => {
    if (!projectId || !feedbackItemId) return;
    const unsubscribe = subscribeToComments(projectId, feedbackItemId, (newComments) => {
      setComments(newComments);
    });
    return () => unsubscribe();
  }, [projectId, feedbackItemId]);

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
    setIsCommenting(false);
  }, [isCommenting, projectId, feedbackItemId, interactionMode]);

  useEffect(() => {
    if (isCommenting && interactionMode === 'comment') {
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
               const pinNumber = visibleComments.length + 1;
               const commentId = await addComment(projectId, feedbackItemId, {
                   authorId: userId,
                   commentText: text,
                   resolved: false,
                   x_coordinate: popover.x,
                   y_coordinate: popover.y,
                   pin_number: pinNumber,
                   pageUrl: window.location.pathname,
                   device: device,
                   dueDate: details?.dueDate
               });
               
               if (details?.dueDate) {
                   await syncCommentToCalendar(commentId, text, details.dueDate, userId, projectId);
               }
          } else if (popover.comment) {
              // Handle Reply (implemented in CommentPopover via onUpdate usually, but let's see)
              // The CommentPopover handles replies internally in state or we need to add a reply endpoint.
              // For now, assume reply adds to array or updateComment is used.
          }
          setPopover({ isOpen: false, x: 0, y: 0 });
      } catch (err) {
          console.error("Failed to submit comment", err);
          alert("Failed to save comment.");
      }
  };
  
  const handleCommentUpdate = async (commentId: string, updates: Partial<FeedbackItemComment>) => {
      if (!projectId || !feedbackItemId) return;
      await updateComment(projectId, feedbackItemId, commentId, updates);
      if (updates.dueDate) {
          // Sync update to calendar? (Ideally yes, but keeping it simple)
      }
  };


  // Sidebar Actions
  const handleSidebarCommentClick = (comment: FeedbackComment | FeedbackItemComment) => {
     const c = comment as FeedbackItemComment;
     // If pageUrl differs, navigate
     if (c.pageUrl && c.pageUrl !== window.location.pathname) {
         // Send message to Host to navigate
         window.parent.postMessage({
             type: 'FEEDBACK_TOOL_NAVIGATE',
             payload: { url: c.pageUrl } // This needs to be absolute or relative correctly handled
         }, '*');
     }
     
     // Scroll to pin
     if (c.x_coordinate !== undefined && c.y_coordinate !== undefined) {
         window.scrollTo({
             top: c.y_coordinate - window.innerHeight / 2,
             behavior: 'smooth'
         });
         
         // Open Popover for this comment
         setPopover({
             isOpen: true,
             x: c.x_coordinate,
             y: c.y_coordinate,
             comment: c,
             isNew: false
         });
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
          await toggleCommentResolved(projectId, feedbackItemId, commentId, comment.resolved);
      }
  };

  if (!projectId || !feedbackItemId) return null;

  return (
    <div 
        className="feedback-tool-root font-sans" 
        ref={contentRef}
        style={{ 
            pointerEvents: interactionMode === 'navigate' ? 'none' : 'auto',
            position: 'absolute', width: '100%', height: '100%', top: 0, left: 0
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
                    zIndex: 9999
                }}
            />
        )}

        {/* Pins */}
        {pins.map(pin => {
            const comment = comments.find(c => c.id === pin.id);
            if (!comment) return null;
            const isResolved = comment.resolved;
            return (
                <div
                    key={pin.id}
                    style={{
                        position: 'absolute',
                        top: pin.y,
                        left: pin.x,
                        zIndex: 10000,
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'auto', // Always clickable
                        opacity: isResolved ? 0.5 : 1
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-lg cursor-pointer transition-transform hover:scale-110 ${isResolved ? 'bg-green-500' : 'bg-blue-600'}`}
                    title={comment.commentText}
                    onClick={(e) => { e.stopPropagation(); handleSidebarCommentClick(comment); }}
                >
                    {pin.number}
                </div>
            );
        })}

        {/* Floating Toggle Button (if sidebar is closed) */}
        {!isSidebarOpen && (
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="fixed top-4 right-4 z-[10001] bg-black text-white px-4 py-2 rounded shadow-lg hover:bg-gray-800 pointer-events-auto"
            >
                Show Feedback
            </button>
        )}

        {/* Sidebar */}
        {isSidebarOpen && (
            <div 
                className={`fixed z-[10001] shadow-2xl bg-white border-border-color pointer-events-auto flex flex-col transition-all duration-300 ${sidebarDock === 'right' ? 'top-0 right-0 h-full w-96 border-l' : 'bottom-0 left-0 w-full h-72 border-t'}`}
            >
                {/* Dock Toggle & Close */}
                <div className="absolute top-2 right-2 flex gap-2 z-10">
                    <button 
                        onClick={() => setSidebarDock(prev => prev === 'right' ? 'bottom' : 'right')}
                        className="p-1 rounded bg-gray-100 hover:bg-gray-200 text-xs"
                        title="Toggle Dock Position"
                    >
                        {sidebarDock === 'right' ? 'Bottom Dock' : 'Right Dock'}
                    </button>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-1 rounded hover:bg-red-100 text-red-500">&times;</button>
                </div>

                <FeedbackSidebar 
                    view="comments"
                    comments={visibleComments}
                    onCommentClick={handleSidebarCommentClick}
                    onClose={() => setIsSidebarOpen(false)}
                    onDelete={handleDeleteComment}
                    onResolve={handleResolveComment}
                    onUpdate={handleCommentUpdate} 
                    position={sidebarDock}
                />
                
                {/* Comment Toggle Btn */}
                <div className={`p-4 bg-white border-gray-200 ${sidebarDock === 'right' ? 'border-t' : 'border-r w-48 flex-shrink-0 flex items-center'}`}>
                    <button 
                        onClick={() => setIsCommenting(!isCommenting)}
                        disabled={interactionMode === 'navigate'}
                        className={`w-full py-2 px-4 rounded font-medium transition-colors ${interactionMode === 'navigate' ? 'bg-gray-300 cursor-not-allowed' : isCommenting ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                         {interactionMode === 'navigate' ? 'Switch to Comment Mode' : isCommenting ? 'Cancel Commenting' : 'Add Comment'}
                    </button>
                </div>
            </div>
        )}

        {/* Popover */}
        {popover.isOpen && (
            <div className="pointer-events-auto">
                <CommentPopover 
                    comment={popover.comment || null}
                    coords={{ x: popover.x, y: popover.y }}
                    contentRef={contentRef}
                    zoom={1}
                    onClose={() => setPopover({ isOpen: false, x: 0, y: 0 })}
                    onSubmit={handlePopoverSubmit}
                    onUpdate={handleCommentUpdate}
                    onResolve={handleResolveComment}
                    onDelete={handleDeleteComment}
                    targetType="website"
                />
            </div>
        )}
    </div>
  );
};

export default FeedbackTool;
