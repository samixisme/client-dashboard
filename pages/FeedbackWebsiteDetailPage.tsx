import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getFeedbackItem, subscribeToComments, subscribeToActivities, deleteComment, toggleCommentResolved, updateComment, updateFeedbackItemStatus } from '../utils/feedbackUtils';
import { auth } from '../utils/firebase';
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
  const [searchParams] = useSearchParams();
  const path = searchParams.get('path') || '';
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
          const availableWidth = containerRef.current.clientWidth - 64; 

          let targetWidth = 0;
          
          switch (device) {
              case 'phone': 
              case 'tablet': 
                  // Phone and tablet views: no scaling, show actual responsive layout
                  setScale(1); 
                  return;
              case 'notebook': targetWidth = 1280; break;
              case 'desktop': 
                  setScale(1); 
                  return;
          }

          // Only scale notebook if it doesn't fit
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
          
          // Construct target URL with path
          let targetUrl = fetchedItem.assetUrl;
          if (path) {
              if (path.startsWith('http://') || path.startsWith('https://')) {
                  targetUrl = path;
              } else {
                  // Ensure clean slash handling
                  const baseUrl = targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl;
                  const pathPart = path.startsWith('/') ? path : `/${path}`;
                  targetUrl = `${baseUrl}${pathPart}`;
              }
          }

          const url = `/api/proxy?url=${encodeURIComponent(targetUrl)}&projectId=${projectId}&feedbackId=${feedbackItemId}`;
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
  }, [projectId, feedbackItemId, path]);

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
          if (rootRef.current) {
              rootRef.current.requestFullscreen().catch(err => {
                  console.error(`Error attempting to enable fullscreen: ${err.message}`);
              });
          }
      } else {
          document.exitFullscreen().catch(err => {
              console.error(`Error attempting to exit fullscreen: ${err.message}`);
          });
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

  const handleUpdateComment = async (commentId: string, updates: Partial<FeedbackItemComment>) => {
      if (projectId && feedbackItemId) {
          await updateComment(projectId, feedbackItemId, commentId, updates);
      }
  };

  // Filter comments by device and Page for Sidebar
  const visibleComments = useMemo(() => {
      return comments.filter(c => {
          const deviceMatch = !c.device || c.device === device;
          
          // Path Logic
          // We must match c.pageUrl with the current 'path' or 'item.assetUrl' + 'path'
          // Since c.pageUrl is now stored as FULL URL (mostly), and 'path' is mostly relative (e.g. /blog)
          // We can check if c.pageUrl ENDS WITH path (loose check) OR equals (strict check)
          
          // 1. Get current Full Target URL (best guess)
          let currentFullUrl = item?.assetUrl || '';
          if (path) {
              if (path.startsWith('http')) currentFullUrl = path;
              else {
                   const baseUrl = currentFullUrl.endsWith('/') ? currentFullUrl.slice(0, -1) : currentFullUrl;
                   const pathPart = path.startsWith('/') ? path : `/${path}`;
                   currentFullUrl = `${baseUrl}${pathPart}`;
              }
          }
          
          // Normalize for comparison (strip trailing slash)
          const normCurrent = currentFullUrl.endsWith('/') && currentFullUrl.length > 1 ? currentFullUrl.slice(0, -1) : currentFullUrl;
          const normComment = c.pageUrl && c.pageUrl.endsWith('/') && c.pageUrl.length > 1 ? c.pageUrl.slice(0, -1) : c.pageUrl || '';

          // If comment URL isn't set, maybe show it everywhere? Or nowhere? Usually assume it belongs to root if empty.
          if (!normComment) return deviceMatch;

          return deviceMatch && normComment === normCurrent;
      });
  }, [comments, device, path, item]);

  // Styles based on device
  const getContainerStyle = (): React.CSSProperties => {
      switch (device) {
          case 'phone': return { 
              width: '375px', 
              height: '700px',
              transform: 'scale(0.75)',
              transformOrigin: 'center center',
          };
          case 'tablet': return { 
              width: '768px', 
              height: '850px',
              transform: 'scale(0.7)',
              transformOrigin: 'center center',
          };
          case 'notebook': return { 
              width: '1280px', 
              height: '800px',
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
          };
          case 'desktop': default: return { width: '100%', height: '100%' };
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

  const handleGoToPage = (targetPath: string, deviceView?: string) => {
      navigate(`/feedback/${projectId}/website/${feedbackItemId}/view?path=${encodeURIComponent(targetPath)}`);
      if (deviceView) {
          const normalizedDevice = deviceView.toLowerCase();
          if (['desktop', 'notebook', 'tablet', 'phone'].includes(normalizedDevice)) {
               setDevice(normalizedDevice as DeviceType);
          }
      }
  };

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
                 {/* Approve/Approved Toggle Button */}
                 <button
                     onClick={async () => {
                         if (projectId && feedbackItemId && item) {
                             const newStatus = item.status === 'approved' ? 'pending' : 'approved';
                             setItem({ ...item, status: newStatus });
                             await updateFeedbackItemStatus(projectId, feedbackItemId, newStatus, auth.currentUser?.uid);
                         }
                     }}
                     className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
                         item?.status === 'approved' 
                             ? 'bg-primary text-black' 
                             : 'bg-surface/90 backdrop-blur-md text-text-primary hover:bg-primary/20 border border-border-color'
                     }`}
                 >
                     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                         <path d="M20 6L9 17l-5-5" />
                     </svg>
                     {item?.status === 'approved' ? 'Approved' : 'Approve'}
                 </button>
                 <button 
                    onClick={() => {
                        if (iframeRef.current) {
                            iframeRef.current.src = iframeRef.current.src;
                        }
                    }} 
                    className="p-2 bg-surface/90 backdrop-blur-md rounded-lg text-text-secondary hover:text-primary hover:bg-surface-light border border-border-color shadow-sm" 
                    title="Refresh Preview"
                 >
                     <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                         <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                         <path d="M3 3v5h5"/>
                         <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                         <path d="M16 16h5v5"/>
                     </svg>
                 </button>
                 <button onClick={toggleFullscreen} className="p-2 bg-surface/90 backdrop-blur-md rounded-lg text-text-secondary hover:text-primary hover:bg-surface-light border border-border-color shadow-sm" title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
                     {isFullscreen ? <ExitFullscreenIcon className="w-5 h-5"/> : <FullscreenIcon className="w-5 h-5"/>}
                 </button>
                 <button onClick={() => setSidebarPosition(p => p === 'right' ? 'bottom' : 'right')} className="p-2 bg-surface/90 backdrop-blur-md rounded-lg text-text-secondary hover:text-primary hover:bg-surface-light border border-border-color shadow-sm hidden md:block" title="Dock Sidebar">
                     <div className={`w-4 h-4 border-2 border-current ${sidebarPosition === 'right' ? 'border-b-transparent' : 'border-r-transparent'}`}></div>
                 </button>
             </div>
         </div>

         {/* Bottom Toolbar Overlay (Devices & Modes) */}
         <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-2 z-50">
             {/* Device Switcher */}
             <div className="bg-surface/90 backdrop-blur-md border border-border-color rounded-lg p-1 flex items-center gap-1 shadow-sm">
                {/* Desktop/Full */}
                <button
                    onClick={() => setDevice('desktop')}
                    className={`p-2 rounded-md transition-all ${device === 'desktop' ? 'bg-primary text-black' : 'text-text-secondary hover:text-primary hover:bg-surface-light'}`}
                    title="Full Width"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                        <line x1="8" y1="21" x2="16" y2="21"/>
                        <line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                </button>
                {/* Notebook */}
                <button
                    onClick={() => setDevice('notebook')}
                    className={`p-2 rounded-md transition-all ${device === 'notebook' ? 'bg-primary text-black' : 'text-text-secondary hover:text-primary hover:bg-surface-light'}`}
                    title="Notebook"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>
                    </svg>
                </button>
                {/* Tablet */}
                <button
                    onClick={() => setDevice('tablet')}
                    className={`p-2 rounded-md transition-all ${device === 'tablet' ? 'bg-primary text-black' : 'text-text-secondary hover:text-primary hover:bg-surface-light'}`}
                    title="Tablet"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
                        <line x1="12" y1="18" x2="12.01" y2="18"/>
                    </svg>
                </button>
                {/* Phone */}
                <button
                    onClick={() => setDevice('phone')}
                    className={`p-2 rounded-md transition-all ${device === 'phone' ? 'bg-primary text-black' : 'text-text-secondary hover:text-primary hover:bg-surface-light'}`}
                    title="Phone"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                        <line x1="12" y1="18" x2="12.01" y2="18"/>
                    </svg>
                </button>
             </div>
             
             {/* Mode Switcher */}
             <div className="bg-surface/90 backdrop-blur-md border border-border-color rounded-lg p-1 flex items-center gap-1 shadow-sm">
                 <button
                    onClick={() => setInteractionMode('navigate')}
                    className={`p-2 rounded-md transition-all ${interactionMode === 'navigate' ? 'bg-primary text-black' : 'text-text-secondary hover:text-primary hover:bg-surface-light'}`}
                    title="Navigate Mode"
                 >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
                        <path d="M13 13l6 6"/>
                    </svg>
                 </button>
                 <button
                    onClick={() => setInteractionMode('comment')}
                    className={`p-2 rounded-md transition-all ${interactionMode === 'comment' ? 'bg-primary text-black' : 'text-text-secondary hover:text-primary hover:bg-surface-light'}`}
                    title="Comment Mode"
                 >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
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
         <div ref={containerRef} className="w-full h-full overflow-hidden flex items-center justify-center p-8">
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
         <FeedbackSidebar 
            view={sidebarView} 
            onViewChange={setSidebarView} 
            comments={visibleComments}
            externalActivities={activities}
            onCommentClick={handleSidebarCommentClick}
            onClose={() => setIsSidebarOpen(false)}
            onDelete={handleDeleteComment}
            onResolve={handleResolveComment}
            onUpdate={handleUpdateComment}
            onGoToPage={handleGoToPage}
            position={sidebarPosition}
            users={data?.users || []}
            currentUserId={auth.currentUser?.uid}
         />
      </div>
    </div>
  );
};

export default FeedbackWebsiteDetailPage;
