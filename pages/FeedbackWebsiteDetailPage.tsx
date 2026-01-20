import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFeedbackItem, subscribeToComments, subscribeToActivities, deleteComment, toggleCommentResolved, updateComment } from '../utils/feedbackUtils';
import { FeedbackItem, FeedbackItemComment, FeedbackComment, User } from '../types';
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';
import { ArrowRightIcon } from '../components/icons/ArrowRightIcon';
import { FullscreenIcon } from '../components/icons/FullscreenIcon';
import { ExitFullscreenIcon } from '../components/icons/ExitFullscreenIcon';
import FeedbackSidebar from '../components/feedback/FeedbackSidebar';
import { SidebarView } from '../components/feedback/FeedbackItemPage';
import { useData } from '../contexts/DataContext';

type DeviceType = 'desktop' | 'notebook' | 'tablet' | 'phone';
type InteractionMode = 'navigate' | 'comment';

const FeedbackWebsiteDetailPage = () => {
  const { projectId, feedbackItemId } = useParams<{ projectId: string; feedbackItemId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  const [item, setItem] = useState<FeedbackItem | null>(null);
  
  // Toolbar State
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('comment');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarPosition, setSidebarPosition] = useState<'right' | 'bottom'>('right');
  const [sidebarView, setSidebarView] = useState<SidebarView>('comments');
  const [comments, setComments] = useState<FeedbackItemComment[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { data } = useData();
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const calculateScale = () => {
          if (!containerRef.current) return;
          // Available space inside the padding (p-8 = 32px * 2 = 64px)
          const availableWidth = containerRef.current.clientWidth - 64; 
          const availableHeight = containerRef.current.clientHeight - 64;

          let targetWidth = 0;
          
          switch (device) {
              case 'phone': targetWidth = 375; break;
              case 'tablet': targetWidth = 768; break;
              case 'notebook': targetWidth = 1440; break;
              case 'desktop': 
                  setScale(1); 
                  return;
          }

          // Calculate scale to fit width, but also check height if we want to ensure it fully fits "inside"
          // For now, prioritising width fit as usually vertical scroll is expected, 
          // but "fit inside a glass frame" might imply full containment. 
          // Let's scale based on width primarily to ensure side padding.
          const newScale = Math.min(1, availableWidth / targetWidth);
          setScale(newScale);
      };

      const observer = new ResizeObserver(calculateScale);
      if (containerRef.current) observer.observe(containerRef.current);
      
      calculateScale();
      window.addEventListener('resize', calculateScale); // Fallback
      
      return () => {
          observer.disconnect();
          window.removeEventListener('resize', calculateScale);
      };
  }, [device, isSidebarOpen, sidebarPosition]);

  // Fetch Logic
  useEffect(() => {
    if (!projectId || !feedbackItemId) {
      setError("Project or Feedback ID is missing.");
      setIsLoading(false);
      return;
    }

    const fetchItem = async () => {
      try {
        const fetchedItem = await getFeedbackItem(projectId, feedbackItemId);
        if (fetchedItem && fetchedItem.assetUrl) {
          setItem(fetchedItem);
          const url = `/api/proxy?url=${encodeURIComponent(fetchedItem.assetUrl)}&projectId=${projectId}&feedbackId=${feedbackItemId}`;
          setProxyUrl(url);
        } else {
          setError("Feedback item not found or it has no associated URL.");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch feedback item.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchItem();
  }, [projectId, feedbackItemId]);

  // Subscriptions
  useEffect(() => {
      if (!projectId || !feedbackItemId) return;

      const unsubscribeComments = subscribeToComments(projectId, feedbackItemId, (newComments) => {
          setComments(newComments);
      });

      const unsubscribeActivities = subscribeToActivities(projectId, feedbackItemId, (newActivities) => {
          setActivities(newActivities);
      });

      return () => {
          unsubscribeComments();
          unsubscribeActivities();
      };
  }, [projectId, feedbackItemId]);

  // Handle Fullscreen Change
  useEffect(() => {
      const handleFullscreenChange = () => {
          setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
          rootRef.current?.requestFullscreen().catch(err => {
              console.error(`Error attempting to enable fullscreen: ${err.message}`);
          });
      } else {
          document.exitFullscreen();
      }
  };

  // Sync State with Iframe (FeedbackTool)
  useEffect(() => {
    const sendMessage = () => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
                type: 'FEEDBACK_TOOL_UPDATE',
                payload: {
                    device,
                    interactionMode
                }
            }, '*');
        }
    };
    
    // Send immediately and on load
    sendMessage();
    const iframe = iframeRef.current;
    if (iframe) {
        iframe.onload = sendMessage;
    }
  }, [device, interactionMode, proxyUrl]);

  // Listen for messages from the iframe
  useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === 'FEEDBACK_TOOL_NAVIGATE') {
              const targetUrl = event.data.payload.url;
              if (targetUrl && projectId && feedbackItemId) {
                  // Reload proxy with new URL
                   const url = `/api/proxy?url=${encodeURIComponent(targetUrl)}&projectId=${projectId}&feedbackId=${feedbackItemId}`;
                   setProxyUrl(url);
              }
          }
          if (event.data?.type === 'PIN_CLICKED') {
              const commentId = event.data.payload.commentId;
              // Open sidebar if closed
              setIsSidebarOpen(true);
              // Switch to comments view
              setSidebarView('comments');
          }
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
  }, [projectId, feedbackItemId]);

  // Sidebar Actions
  const handleSidebarCommentClick = (comment: FeedbackComment | FeedbackItemComment) => {
      // Tell iframe to scroll to this pin
      if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
              type: 'SCROLL_TO_PIN',
              payload: {
                  x: (comment as FeedbackItemComment).x_coordinate,
                  y: (comment as FeedbackItemComment).y_coordinate,
                  commentId: comment.id // Added commentId
              }
          }, '*');
      }
  };

  const handleDeleteComment = async (commentId: string) => {
      if (projectId && feedbackItemId) {
          await deleteComment(projectId, feedbackItemId, commentId);
      }
  };

  const handleResolveComment = async (commentId: string) => {
       if (projectId && feedbackItemId) {
          const comment = comments.find(c => c.id === commentId);
          if (comment) {
               await toggleCommentResolved(projectId, feedbackItemId, commentId, comment.status === 'Resolved');
          }
       }
  };

  // Filter comments by device for Sidebar
  const visibleComments = useMemo(() => {
      return comments.filter(c => !c.device || c.device === device);
  }, [comments, device]);

  // Styles based on device
  const getContainerStyle = () => {
      const baseStyles: React.CSSProperties = {
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
      };

      switch (device) {
          case 'phone': return { ...baseStyles, width: '375px', height: '100%', borderRight: '1px solid #27272A', borderLeft: '1px solid #27272A' };
          case 'tablet': return { ...baseStyles, width: '768px', height: '100%', borderRight: '1px solid #27272A', borderLeft: '1px solid #27272A' };
          case 'notebook': return { ...baseStyles, width: '1440px', height: '100%', borderRight: '1px solid #27272A', borderLeft: '1px solid #27272A' };
          case 'desktop': default: return { ...baseStyles, width: '100%', height: '100%' };
      }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-background p-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2 text-text-primary">Loading Feedback Session...</h1>
          <p className="text-text-secondary">Please wait while we prepare your live feedback environment.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-background p-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2 text-red-600">Error</h1>
          <p className="text-text-secondary">{error}</p>
          <button 
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-primary text-black font-bold rounded hover:bg-primary-hover transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`flex overflow-hidden relative w-full ${isFullscreen ? 'h-screen bg-background' : 'h-[calc(100vh-100px)]'} ${sidebarPosition === 'bottom' ? 'flex-col' : 'flex-row'}`}>
      
      {/* Main Viewer Area */}
      <div className="flex-1 bg-background relative overflow-hidden flex justify-center">
         
         {/* Top Header Overlay */}
         <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start pointer-events-none">
             {/* Left: Title & Back */}
             <div className="bg-surface/90 backdrop-blur-md border border-border-color p-2 rounded-lg shadow-sm pointer-events-auto flex items-center gap-3">
                 <button 
                    onClick={() => navigate(-1)} 
                    className="p-1.5 hover:bg-surface-light rounded-md text-text-secondary hover:text-text-primary transition-colors" 
                    title="Back"
                 >
                     <ArrowLeftIcon className="w-5 h-5"/>
                 </button>
                 <div className="h-4 w-px bg-border-color"></div>
                 <div>
                     <h1 className="text-sm font-bold text-text-primary leading-tight">{item?.name || 'Website Feedback'}</h1>
                     <p className="text-[10px] text-text-secondary">
                        {item ? `V1 • ${new Date(item.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}` : 'Live Preview'}
                     </p>
                 </div>
             </div>

             {/* Right: Actions */}
             <div className="flex gap-2 pointer-events-auto">
                 <button onClick={toggleFullscreen} className="p-2 bg-surface/90 backdrop-blur-md rounded-lg text-text-secondary hover:text-primary hover:bg-surface-light border border-border-color shadow-sm" title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
                     {isFullscreen ? <ExitFullscreenIcon className="w-5 h-5"/> : <FullscreenIcon className="w-5 h-5"/>}
                 </button>
                 <button onClick={() => setSidebarPosition(p => p === 'right' ? 'bottom' : 'right')} className="p-2 bg-surface/90 backdrop-blur-md rounded-lg text-text-secondary hover:text-primary hover:bg-surface-light border border-border-color shadow-sm hidden md:block" title="Dock Sidebar">
                     <div className={`w-4 h-4 border-2 border-current ${sidebarPosition === 'right' ? 'border-b-transparent' : 'border-r-transparent'}`}></div>
                 </button>
             </div>
         </div>

         {/* Bottom Toolbar Overlay (Devices & Modes) */}
         <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-surface/90 backdrop-blur-xl border border-border-color rounded-2xl p-1.5 flex items-center gap-1 shadow-2xl z-50 ring-1 ring-black/5">
             {/* Device Switcher */}
             <div className="flex gap-1">
                {(['desktop', 'notebook', 'tablet', 'phone'] as DeviceType[]).map((d) => (
                    <button
                        key={d}
                        onClick={() => setDevice(d)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all capitalize ${device === d ? 'bg-primary text-black font-bold shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface-light'}`}
                    >
                        {d === 'desktop' ? 'Full' : d}
                    </button>
                ))}
             </div>
             
             <div className="w-px h-5 bg-border-color/50 mx-2"></div>
             
             {/* Mode Switcher */}
             <div className="flex gap-1">
                 <button
                    onClick={() => setInteractionMode('navigate')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all flex items-center gap-2 ${interactionMode === 'navigate' ? 'bg-primary text-black font-bold shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface-light'}`}
                 >
                    👆 Navigate
                 </button>
                 <button
                    onClick={() => setInteractionMode('comment')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all flex items-center gap-2 ${interactionMode === 'comment' ? 'bg-primary text-black font-bold shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface-light'}`}
                 >
                    💬 Comment
                 </button>
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

         {/* Iframe Canvas */}
         <div ref={containerRef} className="w-full h-full overflow-auto flex items-center justify-center p-8">
             {proxyUrl && (
                <div 
                    style={getContainerStyle()} 
                    className="relative shrink-0 transition-all duration-300 rounded-lg overflow-hidden ring-1 ring-border-color shadow-2xl"
                >
                    {/* Glass Gutter Frame */}
                    <div className="absolute inset-0 pointer-events-none z-10 rounded-lg ring-1 ring-inset ring-border-color shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]"></div>
                    
                    <iframe 
                        ref={iframeRef}
                        src={proxyUrl} 
                        className="w-full h-full border-0 bg-white"
                        title="Feedback Website Proxy"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                        style={{ pointerEvents: 'auto' }} 
                    />
                </div>
             )}
         </div>
      </div>

      {/* Sidebar (Host Side) */}
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

         {/* Sidebar Content */}
         <div className="flex-1 overflow-hidden flex flex-col bg-surface/50">
             <FeedbackSidebar 
                view={sidebarView} 
                onViewChange={setSidebarView} 
                comments={visibleComments}
                externalActivities={activities}
                onCommentClick={handleSidebarCommentClick}
                onClose={() => setIsSidebarOpen(false)}
                onDelete={handleDeleteComment}
                onResolve={handleResolveComment}
                position={sidebarPosition}
                users={data?.users || []}
            />
         </div>
      </div>
    </div>
  );
};

export default FeedbackWebsiteDetailPage;
