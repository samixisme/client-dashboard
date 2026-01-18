import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFeedbackItem } from '../utils/feedbackUtils';
import { FeedbackItem } from '../types';
import { ArrowLeftIcon } from '../components/icons/ArrowLeftIcon';

type DeviceType = 'desktop' | 'notebook' | 'tablet' | 'phone';
type InteractionMode = 'navigate' | 'comment';

const FeedbackWebsiteDetailPage = () => {
  const { projectId, feedbackItemId } = useParams<{ projectId: string; feedbackItemId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  
  // Toolbar State
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('comment');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch Logic
  useEffect(() => {
    if (!projectId || !feedbackItemId) {
      setError("Project or Feedback ID is missing.");
      setIsLoading(false);
      return;
    }

    const fetchItem = async () => {
      try {
        const item = await getFeedbackItem(projectId, feedbackItemId);
        if (item && item.assetUrl) {
          const url = `/api/proxy?url=${encodeURIComponent(item.assetUrl)}&projectId=${projectId}&feedbackId=${feedbackItemId}`;
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

  // Listen for navigation requests from the iframe sidebar
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
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
  }, [projectId, feedbackItemId]);

  // Styles based on device
  const getContainerStyle = () => {
      switch (device) {
          case 'phone': return { width: '375px', height: '100%', borderRight: '1px solid #ccc', borderLeft: '1px solid #ccc' };
          case 'tablet': return { width: '768px', height: '100%', borderRight: '1px solid #ccc', borderLeft: '1px solid #ccc' };
          case 'notebook': return { width: '1440px', height: '100%', borderRight: '1px solid #ccc', borderLeft: '1px solid #ccc' };
          case 'desktop': default: return { width: '100%', height: '100%' };
      }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-gray-100 p-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">Loading Feedback Session...</h1>
          <p className="text-gray-600">Please wait while we prepare your live feedback environment.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-gray-100 p-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2 text-red-600">Error</h1>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 overflow-hidden relative">
      
      {/* Top Toolbar */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-20 shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <button 
                onClick={() => navigate(-1)}
                className="flex items-center justify-center p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
                title="Back to Project"
            >
                <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-gray-300 mx-2"></div>
            
            {/* Device Switcher */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
                {(['desktop', 'notebook', 'tablet', 'phone'] as DeviceType[]).map((d) => (
                    <button
                        key={d}
                        onClick={() => setDevice(d)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${device === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {d === 'desktop' ? '100%' : d}
                    </button>
                ))}
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
             <button
                onClick={() => setInteractionMode('navigate')}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${interactionMode === 'navigate' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                👆 Navigate
             </button>
             <button
                onClick={() => setInteractionMode('comment')}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${interactionMode === 'comment' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                💬 Comment
             </button>
          </div>
      </div>

      {/* Iframe Canvas Area */}
      <div className="flex-1 bg-gray-100 overflow-auto flex justify-center relative">
        {proxyUrl && (
            <div 
                style={getContainerStyle()} 
                className="bg-white shadow-lg transition-all duration-300 relative"
            >
                <iframe 
                    ref={iframeRef}
                    src={proxyUrl} 
                    className="w-full h-full border-0"
                    title="Feedback Website Proxy"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                    // If in navigate mode, we let events pass through naturally.
                    // If in comment mode, the injected overlay (FeedbackTool) catches them.
                    style={{ pointerEvents: 'auto' }} 
                />
            </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackWebsiteDetailPage;
