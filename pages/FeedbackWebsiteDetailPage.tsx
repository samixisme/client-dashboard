
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getFeedbackItem, subscribeToComments, addComment, toggleCommentResolved } from '../utils/feedbackUtils';
import { FeedbackItem, FeedbackItemComment } from '../types';
import { useData } from '../contexts/DataContext';
import { LinkIcon } from '../components/icons/LinkIcon';

const FeedbackWebsiteDetailPage = () => {
  const { projectId, feedbackItemId } = useParams<{ projectId: string; feedbackItemId: string }>();
  const { user } = useData();

  const [feedbackItem, setFeedbackItem] = useState<FeedbackItem | null>(null);
  const [comments, setComments] = useState<FeedbackItemComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');

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
      await addComment(projectId, feedbackItemId, {
        authorId: user.id,
        commentText: newCommentText
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
    <div className="flex h-[calc(100vh-100px)] overflow-hidden">
      {/* Left Column: Iframe Preview */}
      <div className="flex-1 bg-white flex flex-col relative overflow-hidden">
         <div className="h-12 bg-gray-100 border-b flex items-center px-4 justify-between">
             <div className="flex items-center gap-2 text-sm text-gray-600 truncate max-w-xl">
                 <LinkIcon className="w-4 h-4" />
                 <a href={feedbackItem.assetUrl} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                     {feedbackItem.assetUrl}
                 </a>
             </div>
             <a href={feedbackItem.assetUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-white border px-3 py-1 rounded hover:bg-gray-50">
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
             <div className="absolute bottom-4 left-4 right-4 bg-yellow-50 border border-yellow-200 p-3 rounded text-xs text-yellow-800 opacity-90 pointer-events-none">
                 Note: Some websites may block embedding. Use "Open in New Tab" if the preview doesn't load.
             </div>
         </div>
      </div>

      {/* Right Column: Sidebar */}
      <div className="w-96 bg-glass border-l border-border-color flex flex-col">
        <div className="p-4 border-b border-border-color">
            <h2 className="text-lg font-bold text-text-primary">{feedbackItem.name}</h2>
            <p className="text-sm text-text-secondary mt-1">{feedbackItem.description}</p>
        </div>

        {/* New Comment Form */}
        <div className="p-4 bg-glass-light border-b border-border-color">
            <h3 className="text-sm font-semibold text-text-primary mb-2">Add Feedback</h3>
            <form onSubmit={handleAddComment}>
                <textarea 
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="General feedback about this page..."
                    className="w-full p-2 rounded bg-glass border border-border-color text-sm mb-2 focus:ring-1 focus:ring-primary outline-none"
                    rows={3}
                />
                <div className="flex justify-end">
                    <button 
                        type="submit" 
                        className="px-4 py-2 bg-primary text-background text-sm font-bold rounded hover:bg-primary-hover"
                    >
                        Post Comment
                    </button>
                </div>
            </form>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {comments.length === 0 ? (
                <p className="text-center text-text-secondary text-sm">No comments yet.</p>
            ) : (
                comments.map((comment) => (
                    <div 
                        key={comment.id} 
                        className={`p-4 rounded-lg border bg-glass-light border-border-color`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-xs text-text-primary">User</span>
                            <span className="text-xs text-text-secondary">{new Date(comment.createdAt?.seconds * 1000).toLocaleString()}</span>
                        </div>
                        <p className={`text-sm text-text-primary mb-3 ${comment.resolved ? 'line-through text-text-secondary' : ''}`}>{comment.commentText}</p>
                        
                         <div className="flex justify-end">
                             <button 
                                onClick={() => handleResolveToggle(comment.id, comment.resolved)}
                                className={`text-xs px-2 py-1 rounded ${comment.resolved ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-secondary/20 text-text-secondary hover:bg-secondary/30'}`}
                             >
                                 {comment.resolved ? 'Resolved' : 'Mark Resolved'}
                             </button>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackWebsiteDetailPage;
