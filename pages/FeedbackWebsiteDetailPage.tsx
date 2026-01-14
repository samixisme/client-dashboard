
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getFeedbackItem, subscribeToComments, addComment, toggleCommentResolved } from '../utils/feedbackUtils';
import { FeedbackItem, FeedbackItemComment } from '../types';
import { useData } from '../contexts/DataContext';
import FeedbackSidebar from '../components/feedback/FeedbackSidebar';
import { LinkIcon } from '../components/icons/LinkIcon';
import { ArrowRightIcon } from '../components/icons/ArrowRightIcon';
import { ChevronDownIcon } from '../components/icons/ChevronDownIcon';

const FeedbackWebsiteDetailPage = () => {
  const { projectId, feedbackItemId } = useParams<{ projectId: string; feedbackItemId: string }>();
  const { user } = useData();

  const [feedbackItem, setFeedbackItem] = useState<FeedbackItem | null>(null);
  const [comments, setComments] = useState<FeedbackItemComment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Sidebar State
  const [newCommentText, setNewCommentText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'feedback' | 'bug'>('all');
  const [sidebarView, setSidebarView] = useState<'comments' | 'activity'>('comments');
  const [sidebarPosition, setSidebarPosition] = useState<'right' | 'bottom'>('right');

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

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !projectId || !feedbackItemId || !user) return;

    try {
      const textToSend = filterType !== 'all' ? `[${filterType.toUpperCase()}] ${newCommentText}` : newCommentText;

      await addComment(projectId, feedbackItemId, {
        authorId: user.id,
        commentText: textToSend
      });
      setNewCommentText('');
    } catch (error) {
      console.error("Failed to add comment", error);
    }
  };

  const handleNavigate = (path: string) => {
      // For iframe, we might send a postMessage or just let user click the link
      console.log("Navigating to", path);
  };

  if (loading) return <div className="p-10 text-center text-text-secondary">Loading...</div>;
  if (!feedbackItem) return <div className="p-10 text-center text-text-secondary">Feedback Item Not Found</div>;

  return (
    <div className={`flex overflow-hidden relative ${sidebarPosition === 'bottom' ? 'flex-col h-[calc(100vh-100px)]' : 'flex-row h-[calc(100vh-100px)]'}`}>
      {/* 1. Main Viewer (Iframe) */}
      <div className="flex-1 bg-white flex flex-col relative overflow-hidden transition-all duration-300">
         <div className="h-12 bg-gray-100 border-b flex items-center px-4 justify-between">
             <div className="flex items-center gap-2 text-sm text-gray-600 truncate max-w-xl">
                 <LinkIcon className="w-4 h-4" />
                 <a href={feedbackItem.assetUrl} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                     {feedbackItem.assetUrl}
                 </a>
             </div>
             <a href={feedbackItem.assetUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-white border px-3 py-1 rounded hover:bg-gray-50 text-gray-700 font-medium">
                 Open in New Tab
             </a>
         </div>
         <div className="flex-1 relative">
             <iframe 
                src={feedbackItem.assetUrl} 
                title="Website Preview"
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-same-origin allow-forms" // Be careful with security here
             />
             <div className="absolute bottom-4 left-4 right-4 bg-yellow-50 border border-yellow-200 p-3 rounded text-xs text-yellow-800 opacity-90 pointer-events-none shadow-sm">
                 Note: Some websites may block embedding. Use "Open in New Tab" if the preview doesn't load.
             </div>
         </div>

         {/* Toolbar Overlay */}
        <div className="absolute top-16 left-4 z-20 flex gap-2">
             <button onClick={() => setSidebarPosition(p => p === 'right' ? 'bottom' : 'right')} className="p-2 bg-white/80 rounded-lg text-gray-700 hover:bg-white border border-gray-300 shadow-sm" title="Rotate Layout">
                 <div className={`w-4 h-4 border-2 border-current ${sidebarPosition === 'right' ? 'border-b-transparent' : 'border-r-transparent'}`}></div>
             </button>
        </div>
      </div>

       {/* Toggle Sidebar Button (When Closed) */}
      {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 right-4 z-50 p-2 bg-glass border border-border-color rounded-lg shadow-lg text-text-primary hover:bg-glass-light transition-colors"
          >
              <ArrowRightIcon className="w-5 h-5 transform rotate-180" />
          </button>
      )}

      {/* 2. Sidebar Area */}
      <div className={`${isSidebarOpen ? (sidebarPosition === 'right' ? 'w-96 border-l' : 'h-80 w-full border-t') : 'w-0 h-0 opacity-0'} transition-all duration-300 ease-in-out bg-glass border-border-color flex flex-col overflow-hidden relative shadow-xl z-20`}>
        {/* Header */}
        <div className="p-4 border-b border-border-color flex justify-between items-center bg-glass flex-shrink-0">
             <div className="flex-1 pr-4">
                <h2 className="text-lg font-bold text-text-primary truncate">{feedbackItem.name}</h2>
                <div className="flex gap-4 text-xs text-text-secondary mt-1">
                    <button onClick={() => setSidebarView('comments')} className={`${sidebarView === 'comments' ? 'text-primary font-bold' : 'hover:text-text-primary'}`}>Comments</button>
                    <button onClick={() => setSidebarView('activity')} className={`${sidebarView === 'activity' ? 'text-primary font-bold' : 'hover:text-text-primary'}`}>Activity</button>
                </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="text-text-secondary hover:text-text-primary p-1">
                 <ArrowRightIcon className={`w-5 h-5 ${sidebarPosition === 'bottom' ? 'rotate-90' : ''}`} />
             </button>
        </div>

        {/* New Comment Form */}
        <div className="p-4 bg-glass-light border-b border-border-color flex-shrink-0">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-text-primary">Add Feedback</h3>
                <div className="flex bg-glass border border-border-color rounded-lg p-0.5">
                     <button onClick={() => setFilterType('feedback')} className={`text-[10px] px-2 py-0.5 rounded ${filterType === 'feedback' ? 'bg-primary text-background font-bold' : 'text-text-secondary hover:text-text-primary'}`}>Feedback</button>
                     <button onClick={() => setFilterType('bug')} className={`text-[10px] px-2 py-0.5 rounded ${filterType === 'bug' ? 'bg-red-500 text-white font-bold' : 'text-text-secondary hover:text-text-primary'}`}>Bug</button>
                </div>
            </div>
            <form onSubmit={handleAddComment}>
                <textarea 
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder={filterType === 'bug' ? "Describe the bug..." : "Share your feedback..."}
                    className="w-full p-3 rounded-lg bg-glass border border-border-color text-sm mb-2 focus:ring-1 focus:ring-primary outline-none resize-none text-text-primary placeholder-text-secondary"
                    rows={3}
                />
                <div className="flex justify-end">
                    <button 
                        type="submit" 
                        className={`px-4 py-2 text-background text-sm font-bold rounded-lg transition-colors ${filterType === 'bug' ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary-hover'}`}
                    >
                        Post {filterType === 'bug' ? 'Bug Report' : 'Comment'}
                    </button>
                </div>
            </form>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
            <FeedbackSidebar 
                view={sidebarView}
                comments={comments}
                onCommentClick={() => {}} // No seeking for websites
                onClose={() => {}} // Controlled by outer header
                onNavigate={handleNavigate}
                position={sidebarPosition}
            />
        </div>
      </div>
    </div>
  );
};

export default FeedbackWebsiteDetailPage;
