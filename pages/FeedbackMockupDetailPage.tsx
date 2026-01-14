
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getFeedbackItem, subscribeToComments, addComment, toggleCommentResolved } from '../utils/feedbackUtils';
import { FeedbackItem, FeedbackItemComment } from '../types';
import { useData } from '../contexts/DataContext';
import { ArrowRightIcon } from '../components/icons/ArrowRightIcon';

const FeedbackMockupDetailPage = () => {
  const { projectId, feedbackItemId } = useParams<{ projectId: string; feedbackItemId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useData();

  const [feedbackItem, setFeedbackItem] = useState<FeedbackItem | null>(null);
  const [comments, setComments] = useState<FeedbackItemComment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Comment State
  const [newCommentText, setNewCommentText] = useState('');
  const [clickPosition, setClickPosition] = useState<{ x: number, y: number } | null>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (projectId && feedbackItemId) {
      // Fetch the feedback item details
      getFeedbackItem(projectId, feedbackItemId).then((item) => {
        setFeedbackItem(item);
        setLoading(false);
      });

      // Subscribe to real-time comments
      const unsubscribe = subscribeToComments(projectId, feedbackItemId, (fetchedComments) => {
        setComments(fetchedComments);
      });

      return () => unsubscribe();
    }
  }, [projectId, feedbackItemId]);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setClickPosition({ x, y });
    setNewCommentText(''); // Clear previous text
    setIsSidebarOpen(true); // Open sidebar to show input
    // Optional: Focus the input field automatically
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !projectId || !feedbackItemId || !user || !clickPosition) return;

    try {
      await addComment(projectId, feedbackItemId, {
        authorId: user.id,
        commentText: newCommentText,
        position: clickPosition
      });
      setNewCommentText('');
      setClickPosition(null);
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
      {/* Left Column: Interactive Image */}
      <div className="flex-1 bg-black/10 flex items-center justify-center p-4 overflow-auto relative">
        <div className="relative inline-block">
          <img 
            ref={imageRef}
            src={feedbackItem.assetUrl} 
            alt={feedbackItem.name} 
            onClick={handleImageClick}
            className="max-w-full max-h-full cursor-crosshair shadow-lg rounded"
          />
          
          {/* Render Existing Comments Pins */}
          {comments.map((comment, index) => (
             comment.position && !comment.resolved && (
                <div 
                    key={comment.id}
                    className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 shadow-md
                        ${selectedCommentId === comment.id ? 'bg-primary border-white scale-125 z-20 ring-2 ring-primary/50' : 'bg-secondary border-white z-10'}`}
                    style={{ left: `${comment.position.x}%`, top: `${comment.position.y}%` }}
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering image click
                        setSelectedCommentId(comment.id);
                        setIsSidebarOpen(true);
                    }}
                >
                    {index + 1}
                </div>
             )
          ))}

          {/* Render New Comment Pin Preview */}
          {clickPosition && (
              <div 
                className="absolute w-8 h-8 rounded-full bg-primary border-2 border-white flex items-center justify-center text-white font-bold text-sm transform -translate-x-1/2 -translate-y-1/2 z-30 animate-pulse shadow-md"
                style={{ left: `${clickPosition.x}%`, top: `${clickPosition.y}%` }}
              >
                  +
              </div>
          )}
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
        <div className="p-4 border-b border-border-color flex justify-between items-start">
            <div>
                <h2 className="text-lg font-bold text-text-primary">{feedbackItem.name}</h2>
                <p className="text-sm text-text-secondary mt-1 line-clamp-2">{feedbackItem.description}</p>
            </div>
             <button onClick={() => setIsSidebarOpen(false)} className="text-text-secondary hover:text-text-primary">
                 <ArrowRightIcon className="w-5 h-5" />
             </button>
        </div>

        {/* New Comment Form (Only appears when position is selected) */}
        {clickPosition && (
            <div className="p-4 bg-primary/10 border-b border-primary/20 animate-in slide-in-from-right duration-200">
                <h3 className="text-sm font-semibold text-primary mb-2">Add Comment at Position</h3>
                <form onSubmit={handleAddComment}>
                    <textarea 
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        placeholder="Type your comment here..."
                        className="w-full p-2 rounded bg-glass-light border border-border-color text-sm mb-2 focus:ring-1 focus:ring-primary outline-none text-text-primary placeholder-text-secondary"
                        rows={3}
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                         <button 
                            type="button" 
                            onClick={() => setClickPosition(null)}
                            className="px-3 py-1 text-xs text-text-secondary hover:text-text-primary"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="px-3 py-1 bg-primary text-background text-xs font-bold rounded hover:bg-primary-hover"
                        >
                            Post Comment
                        </button>
                    </div>
                </form>
            </div>
        )}

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4 text-text-secondary">
                    <p className="mb-2 text-3xl">📍</p>
                    <p className="text-sm">Click anywhere on the image to pin a comment.</p>
                </div>
            ) : (
                comments.map((comment, index) => (
                    <div 
                        key={comment.id} 
                        className={`p-3 rounded-lg border transition-all cursor-pointer ${selectedCommentId === comment.id ? 'bg-primary/10 border-primary shadow-md transform scale-[1.02]' : 'bg-glass-light border-border-color hover:border-primary/50'}`}
                        onClick={() => setSelectedCommentId(comment.id)}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-xs text-primary bg-primary/20 px-1.5 py-0.5 rounded-full mr-2 min-w-[24px] text-center">#{index + 1}</span>
                            <span className="text-xs text-text-secondary">{comment.createdAt?.seconds ? new Date(comment.createdAt.seconds * 1000).toLocaleString() : 'Just now'}</span>
                        </div>
                        <p className={`text-sm text-text-primary mb-2 ${comment.resolved ? 'line-through text-text-secondary' : ''}`}>{comment.commentText}</p>
                        
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-border-color/50">
                             <span className="text-xs text-text-secondary flex items-center gap-1">
                                <div className="w-4 h-4 rounded-full bg-secondary/30"></div> User
                             </span> 
                             <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleResolveToggle(comment.id, comment.resolved);
                                }}
                                className={`text-xs px-2 py-1 rounded transition-colors ${comment.resolved ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-secondary/20 text-text-secondary hover:bg-secondary/30'}`}
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

export default FeedbackMockupDetailPage;
