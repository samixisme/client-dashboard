
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getFeedbackItem, subscribeToComments, addComment, toggleCommentResolved } from '../utils/feedbackUtils';
import { FeedbackItem, FeedbackItemComment } from '../types';
import { useData } from '../contexts/DataContext';
import { LinkIcon } from '../components/icons/LinkIcon';
import { ArrowRightIcon } from '../components/icons/ArrowRightIcon';
import { ChevronDownIcon } from '../components/icons/ChevronDownIcon';

const FeedbackWebsiteDetailPage = () => {
  const { projectId, feedbackItemId } = useParams<{ projectId: string; feedbackItemId: string }>();
  const { user } = useData();

  const [feedbackItem, setFeedbackItem] = useState<FeedbackItem | null>(null);
  const [comments, setComments] = useState<FeedbackItemComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'feedback' | 'bug'>('all');

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
      // NOTE: We could add a 'type' field to the comment schema for bug vs feedback,
      // but strictly following the current schema we just use text.
      // We'll prepend a tag to the text for now if strictly adhering to schema, 
      // or just assume generic comments. 
      // The prompt asks for a toggle/tag if possible. We'll simulate it visually.
      
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

  const handleResolveToggle = async (commentId: string, currentStatus: boolean) => {
      if (!projectId || !feedbackItemId) return;
      await toggleCommentResolved(projectId, feedbackItemId, commentId, currentStatus);
  };

  if (loading) return <div className="p-10 text-center text-text-secondary">Loading...</div>;
  if (!feedbackItem) return <div className="p-10 text-center text-text-secondary">Feedback Item Not Found</div>;

  return (
    <div className="flex h-[calc(100vh-100px)] overflow-hidden relative">
      {/* Left Column: Iframe Preview */}
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
             {/* Overlay to hint about limitations */}
             <div className="absolute bottom-4 left-4 right-4 bg-yellow-50 border border-yellow-200 p-3 rounded text-xs text-yellow-800 opacity-90 pointer-events-none shadow-sm">
                 Note: Some websites may block embedding. Use "Open in New Tab" if the preview doesn't load.
             </div>
         </div>
      </div>

       {/* Toggle Sidebar Button */}
      {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 right-4 z-50 p-2 bg-glass border border-border-color rounded-lg shadow-lg text-text-primary hover:bg-glass-light transition-colors"
          >
              <ArrowRightIcon className="w-5 h-5 transform rotate-180" />
          </button>
      )}

      {/* Right Column: Sidebar */}
      <div className={`${isSidebarOpen ? 'w-96 translate-x-0' : 'w-0 translate-x-full'} transition-all duration-300 ease-in-out bg-glass border-l border-border-color flex flex-col overflow-hidden relative`}>
        <div className="p-4 border-b border-border-color flex justify-between items-start bg-glass">
             <div className="flex-1 pr-4">
                <h2 className="text-lg font-bold text-text-primary truncate">{feedbackItem.name}</h2>
                <div className="flex gap-2 mt-2">
                    <a href={feedbackItem.assetUrl} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors">
                        <LinkIcon className="w-3 h-3" /> Open Website
                    </a>
                </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="text-text-secondary hover:text-text-primary p-1">
                 <ArrowRightIcon className="w-5 h-5" />
             </button>
        </div>

        {/* New Comment Form */}
        <div className="p-4 bg-glass-light border-b border-border-color">
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

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-glass/50">
             {comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 text-text-secondary">
                    <p className="mb-2 text-3xl">💬</p>
                    <p className="text-sm">No feedback yet. Be the first to start the discussion!</p>
                </div>
            ) : (
                comments.map((comment) => {
                    const isBug = comment.commentText.startsWith('[BUG]');
                    const displayText = comment.commentText.replace(/^\[(BUG|FEEDBACK)\]\s*/, '');
                    
                    return (
                        <div 
                            key={comment.id} 
                            className={`p-4 rounded-xl border bg-glass transition-all ${isBug ? 'border-red-500/30 bg-red-500/5' : 'border-border-color bg-glass-light hover:border-primary/30'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isBug ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'}`}>U</div>
                                    <span className="text-xs font-semibold text-text-primary">User</span>
                                    {isBug && <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded">BUG</span>}
                                </div>
                                <span className="text-[10px] text-text-secondary">{new Date(comment.createdAt?.seconds * 1000).toLocaleString()}</span>
                            </div>
                            <p className={`text-sm text-text-primary mb-3 leading-relaxed ${comment.resolved ? 'line-through text-text-secondary opacity-70' : ''}`}>{displayText}</p>
                            
                             <div className="flex justify-end pt-2 border-t border-border-color/30">
                                 <button 
                                    onClick={() => handleResolveToggle(comment.id, comment.resolved)}
                                    className={`text-xs px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${comment.resolved ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-secondary/20 text-text-secondary hover:bg-secondary/30'}`}
                                 >
                                     {comment.resolved ? (
                                         <><span className="w-2 h-2 rounded-full bg-green-400"></span> Resolved</>
                                     ) : (
                                         'Mark as Resolved'
                                     )}
                                 </button>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackWebsiteDetailPage;
