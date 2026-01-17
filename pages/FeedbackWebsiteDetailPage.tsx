
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFeedbackItem, subscribeToComments, addComment, toggleCommentResolved, updateFeedbackItemStatus, deleteComment } from '../utils/feedbackUtils';
import { FeedbackItem, FeedbackItemComment } from '../types';
import { useData } from '../contexts/DataContext';
import FeedbackSidebar from '../components/feedback/FeedbackSidebar';
import { ArrowRightIcon } from '../components/icons/ArrowRightIcon';
import { PanIcon } from '../components/icons/PanIcon';
import { CommentsIcon } from '../components/icons/CommentsIcon';
import { GridViewIcon } from '../components/icons/GridViewIcon';
import { RefreshIcon } from '../components/icons/RefreshIcon';

const DEVICES = {
    desktop: { label: 'Desktop', width: '100%', height: '100%' },
    laptop: { label: 'Laptop', width: 1366, height: 768 },
    tablet: { label: 'Tablet', width: 768, height: 1024 },
    phone: { label: 'Phone', width: 375, height: 812 },
};
type DeviceType = keyof typeof DEVICES;

const FeedbackWebsiteDetailPage = () => {
  const { projectId, feedbackItemId } = useParams<{ projectId: string; feedbackItemId: string }>();
  const navigate = useNavigate();
  const { user } = useData();

  const [feedbackItem, setFeedbackItem] = useState<FeedbackItem | null>(null);
  const [comments, setComments] = useState<FeedbackItemComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [mode, setMode] = useState<'navigate' | 'comment'>('navigate');
  const [scale, setScale] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarView, setSidebarView] = useState<'comments' | 'activity'>('comments');
  const [sidebarPosition, setSidebarPosition] = useState<'right' | 'bottom'>('right');
  const [currentUrl, setCurrentUrl] = useState('');
  const [pageHeight, setPageHeight] = useState<number | undefined>();
  
  const [clickPosition, setClickPosition] = useState<{ x: number, y: number } | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [activePinId, setActivePinId] = useState<string | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ scrollTop: 0, startY: 0 });
  const clickPreventRef = useRef(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const chassisRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (projectId && feedbackItemId) {
      getFeedbackItem(projectId, feedbackItemId).then((item) => {
        setFeedbackItem(item);
        if (item && !currentUrl) setCurrentUrl(item.assetUrl);
        setLoading(false);
      });
      const unsubscribe = subscribeToComments(projectId, feedbackItemId, setComments);
      return () => unsubscribe();
    }
  }, [projectId, feedbackItemId, currentUrl]);

  const cleanUrl = (url: string) => {
    try {
        const u = new URL(url);
        u.searchParams.delete('t');
        return u.toString().replace(/\/$/, '');
    } catch (e) {
        return url ? url.replace(/\/$/, '') : '';
    }
  };

  const filteredComments = useMemo(() => comments.filter((c: any) => {
    const deviceMatch = !c.device || c.device === device;
    if (!deviceMatch) return false;
    const commentUrl = c.pageUrl || feedbackItem?.assetUrl;
    
    return cleanUrl(commentUrl) === cleanUrl(currentUrl);
  }), [comments, device, currentUrl, feedbackItem]);

  const updateScale = useCallback(() => {
    if (!containerRef.current || device === 'desktop') { setScale(1); return; }
    const { width: dw, height: dh } = DEVICES[device];
    const { clientWidth: cw, clientHeight: ch } = containerRef.current;
    const padding = 40;
    const availableWidth = cw - padding;
    const availableHeight = ch - padding;
    const scaleX = availableWidth / (dw as number);
    const scaleY = availableHeight / (dh as number);
    setScale(Math.min(scaleX, scaleY, 1));
  }, [device]);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  // Restore the robust scroll handling
  useEffect(() => {
    const chassisElement = chassisRef.current;
    if (!chassisElement) return;

    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        chassisElement.scrollTop += e.deltaY;
    };

    chassisElement.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
        chassisElement.removeEventListener('wheel', handleWheel);
    };
  }, [device]); // Re-attach when device changes

  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const doc = iframe.contentWindow?.document;
      const iframeBody = doc?.body;
      const docEl = doc?.documentElement;

      if (iframeBody && docEl) {
        const newHeight = Math.max(
          iframeBody.scrollHeight,
          iframeBody.offsetHeight,
          docEl.clientHeight,
          docEl.scrollHeight,
          docEl.offsetHeight
        );
        
        if (newHeight > 50) {
            setPageHeight(prev => (Math.abs((prev || 0) - newHeight) > 10 ? newHeight : prev));
        }
      }
    } catch (error) {
      console.warn("Cross-origin iframe detected. Using viewport height to prevent layout distortion.");
      setPageHeight(undefined);
    }
  }, []);

  useEffect(() => { setPageHeight(undefined); }, [currentUrl]);

  useEffect(() => {
    handleIframeLoad();
    
    const t1 = setTimeout(handleIframeLoad, 500);
    const t2 = setTimeout(handleIframeLoad, 1500);
    const interval = setInterval(handleIframeLoad, 2000);

    return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearInterval(interval);
    };
  }, [device, handleIframeLoad, currentUrl]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    clickPreventRef.current = false;
    if (chassisRef.current) {
        setIsPanning(true);
        panStartRef.current = { scrollTop: chassisRef.current.scrollTop, startY: e.pageY };
        document.body.style.userSelect = 'none';
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning || !chassisRef.current || e.buttons !== 1) {
      if(isPanning) {
        setIsPanning(false);
        document.body.style.userSelect = '';
      }
      return;
    };
    clickPreventRef.current = true;
    const dy = e.pageY - panStartRef.current.startY;
    chassisRef.current.scrollTop = panStartRef.current.scrollTop - dy;
  };
  
  const handleMouseUp = () => {
    setIsPanning(false);
    document.body.style.userSelect = '';
    setTimeout(() => clickPreventRef.current = false, 50);
  };
  
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (clickPreventRef.current || isPanning) return;
      if (mode !== 'comment' || !chassisRef.current) return;
      
      const rect = e.currentTarget.getBoundingClientRect();
      
      // Calculate coordinates relative to the overlay content, accounting for scale
      // rect.top changes as we scroll (in expanded mode), so it accounts for scroll offset automatically
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      
      setClickPosition({ x, y });
  };
  
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !projectId || !feedbackItemId || !user || !clickPosition) return;
    
    const userId = user?.uid; 
    if (!userId) return;

    const newPinNumber = (comments.filter(c => c.pin_number).length) + 1;
    await addComment(projectId, feedbackItemId, {
      authorId: userId, 
      commentText: newCommentText, 
      x_coordinate: clickPosition.x,
      y_coordinate: clickPosition.y,
      pin_number: newPinNumber,
      device: device as any, 
      pageUrl: cleanUrl(currentUrl)
    });
    setClickPosition(null);
    setNewCommentText('');
  };

  const handleDeleteComment = async (commentId: string) => { await deleteComment(projectId!, feedbackItemId!, commentId); };
  const handleResolveComment = async (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (comment) await toggleCommentResolved(projectId!, feedbackItemId!, commentId, comment.resolved);
  };

  const refreshView = () => {
      const chassis = chassisRef.current;
      if (chassis) chassis.scrollTop = 0;
      setCurrentUrl(prev => {
        const newUrl = new URL(prev);
        newUrl.searchParams.set('t', Date.now().toString());
        return newUrl.toString();
    });
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!feedbackItem) return <div className="p-10 text-center">Not Found</div>;

  const isDesktop = device === 'desktop';
  const cursorClass = mode === 'comment' ? 'cursor-crosshair' : (isPanning ? 'cursor-grabbing' : 'cursor-grab');

  return (
    <div className={`flex overflow-hidden relative ${sidebarPosition === 'bottom' ? 'flex-col h-[calc(100vh-100px)]' : 'flex-row h-[calc(100vh-100px)]'}`}>
        <div className="flex-1 bg-gray-100 flex flex-col relative overflow-hidden">
            <div className="bg-white border-b border-border-color z-30 flex-shrink-0 shadow-sm">
                 <div className="h-14 flex items-center justify-between px-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(`/feedback/${projectId}/websites`)} className="p-1.5 rounded-md hover:bg-gray-100"><GridViewIcon className="w-5 h-5" /></button>
                        <div className="h-6 w-px bg-border-color" />
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            {(Object.keys(DEVICES) as DeviceType[]).map(d => (
                                <button key={d} onClick={() => setDevice(d)} className={`px-3 py-1.5 rounded-md text-xs font-semibold ${device === d ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'}`}>{DEVICES[d].label}</button>
                            ))}
                        </div>
                        <div className="h-6 w-px bg-border-color" />
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button onClick={() => setMode('comment')} className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 ${mode === 'comment' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary'}`}><CommentsIcon className="w-4 h-4" /> Comment</button>
                            <button onClick={() => setMode('navigate')} className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 ${mode === 'navigate' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'}`}><PanIcon className="w-4 h-4" /> Navigate</button>
                        </div>
                        <div className="h-6 w-px bg-border-color" />
                        <button onClick={refreshView} className="p-1.5 rounded-md hover:bg-gray-100 text-text-secondary" title="Refresh View"><RefreshIcon className="w-5 h-5" /></button>
                    </div>
                </div>
            </div>

            <div ref={containerRef} className="flex-1 overflow-hidden relative flex items-center justify-center bg-dots-pattern">
                <div 
                    ref={chassisRef}
                    style={{
                        width: isDesktop ? '100%' : DEVICES[device].width,
                        height: isDesktop ? '100%' : DEVICES[device].height,
                        transform: isDesktop ? 'none' : `scale(${scale})`,
                    }}
                    className={`relative bg-white transition-transform duration-300 overflow-auto no-scrollbar ${isDesktop ? '' : 'border-4 border-gray-800 shadow-2xl rounded-lg'}`}
                >
                    <div className="relative" style={{ height: pageHeight ? `${pageHeight}px` : '100%' }}>
                        <iframe 
                            key={currentUrl}
                            ref={iframeRef}
                            src={currentUrl} 
                            title="Device Preview"
                            className="w-full h-full border-none bg-white absolute inset-0"
                            style={{ 
                                height: pageHeight ? `${pageHeight}px` : '100%', 
                                pointerEvents: (!pageHeight && mode === 'navigate') ? 'auto' : 'none' 
                            }}
                            onLoad={handleIframeLoad}
                            scrolling={pageHeight ? "no" : "yes"}
                        />
                        <div 
                            className={`absolute inset-0 z-20 ${cursorClass}`}
                            style={{ 
                                height: pageHeight ? `${pageHeight}px` : '100%',
                                pointerEvents: (!pageHeight && mode === 'navigate') ? 'none' : 'auto'
                            }}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onClick={mode === 'comment' ? handleOverlayClick : undefined}
                        >
                            {mode === 'comment' && filteredComments.map((comment) => (
                                comment.x_coordinate != null && comment.y_coordinate != null && !comment.resolved && (
                                    <div
                                        key={comment.id}
                                        className={`absolute flex items-center justify-center rounded-full font-bold text-white shadow-md border-2 border-white transition-transform hover:scale-110 cursor-pointer ${activePinId === comment.id ? 'bg-primary z-50 scale-125' : 'bg-primary/80 z-40'}`}
                                        style={{ 
                                            left: `${comment.x_coordinate}px`, 
                                            top: `${comment.y_coordinate}px`, 
                                            width: '32px', 
                                            height: '32px', 
                                            fontSize: '14px', 
                                            transform: 'translate(-50%, -50%)',
                                        }}
                                        onClick={(e) => { e.stopPropagation(); setActivePinId(comment.id); }}
                                    >
                                        {comment.pin_number}
                                    </div>
                                )
                            ))}
                            {mode === 'comment' && clickPosition && ( <div className="absolute w-8 h-8 rounded-full bg-white border-2 border-primary text-primary flex items-center justify-center font-bold shadow-lg animate-bounce z-50" style={{ left: `${clickPosition.x}px`, top: `${clickPosition.y}px`, transform: 'translate(-50%, -50%)' }}>+</div> )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        {!isSidebarOpen && (
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="absolute top-20 right-0 z-50 p-2 bg-white shadow-lg rounded-l-xl text-text-primary hover:text-primary transition-all border border-r-0 border-border-color"
            >
                <ArrowRightIcon className="w-5 h-5 transform rotate-180"/>
            </button>
        )}

        <div className={`${isSidebarOpen ? (sidebarPosition === 'right' ? 'w-96 border-l' : 'h-80 w-full border-t') : 'w-0 h-0 opacity-0'} transition-all duration-300 ease-in-out bg-glass border-border-color flex flex-col overflow-hidden relative shadow-2xl z-20`}>
            <div className="p-4 border-b border-border-color bg-glass flex justify-between items-center flex-shrink-0">
                <div className="flex gap-4">
                    <button onClick={() => setSidebarView('comments')} className={`pb-1 text-sm font-bold border-b-2 ${sidebarView === 'comments' ? 'border-primary text-primary' : 'border-transparent text-text-secondary'}`}>Comments</button>
                    <button onClick={() => setSidebarView('activity')} className={`pb-1 text-sm font-bold border-b-2 ${sidebarView === 'activity' ? 'border-primary text-primary' : 'border-transparent text-text-secondary'}`}>Activity</button>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-1 rounded text-text-secondary"><ArrowRightIcon className={`w-5 h-5 ${sidebarPosition === 'bottom' ? 'rotate-90' : ''}`}/></button>
            </div>
            
            {clickPosition && sidebarView === 'comments' && (
                 <div className="p-4 bg-primary/5 border-b border-primary/20 flex-shrink-0 animate-in slide-in-from-right duration-200">
                     <div className="flex justify-between items-center mb-2">
                         <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                             <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div> New Pin
                         </span>
                         <button onClick={() => setClickPosition(null)} className="text-xs text-text-secondary hover:text-text-primary underline">Cancel</button>
                     </div>
                    <form onSubmit={handleSubmitComment}>
                        <textarea className="w-full bg-white border rounded-xl p-3 text-sm" rows={3} placeholder="What needs changing?" value={newCommentText} onChange={e => setNewCommentText(e.target.value)} autoFocus />
                        <button type="submit" className="w-full bg-primary text-white py-2 mt-2 rounded-lg text-sm font-bold">Post Comment</button>
                    </form>
                </div>
            )}

            <div className="flex-1 overflow-y-auto">
               <FeedbackSidebar 
                   view={sidebarView} 
                   comments={filteredComments} 
                   onCommentClick={(c) => setActivePinId(c.id)} 
                   onClose={() => setIsSidebarOpen(false)} 
                   onDelete={handleDeleteComment} 
                   onResolve={handleResolveComment} 
                   position={sidebarPosition} />
            </div>
        </div>
    </div>
  );
};

export default FeedbackWebsiteDetailPage;
