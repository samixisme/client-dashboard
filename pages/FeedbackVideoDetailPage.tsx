
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getFeedbackItem, subscribeToComments, addComment, toggleCommentResolved } from '../utils/feedbackUtils';
import { FeedbackItem, FeedbackItemComment } from '../types';
import { useData } from '../contexts/DataContext';
import { PlayIcon } from '../components/icons/PlayIcon';
import { PauseIcon } from '../components/icons/PauseIcon';

const FeedbackVideoDetailPage = () => {
  const { projectId, feedbackItemId } = useParams<{ projectId: string; feedbackItemId: string }>();
  const { user } = useData();

  const [feedbackItem, setFeedbackItem] = useState<FeedbackItem | null>(null);
  const [comments, setComments] = useState<FeedbackItemComment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // New Comment State
  const [newCommentText, setNewCommentText] = useState('');
  const [commentTimestamp, setCommentTimestamp] = useState<number | null>(null);

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

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
      if (videoRef.current) {
          setDuration(videoRef.current.duration);
      }
  }

  const handleSeek = (time: number) => {
      if (videoRef.current) {
          videoRef.current.currentTime = time;
          setCurrentTime(time);
      }
  };

  const startComment = () => {
      if (videoRef.current) {
          videoRef.current.pause();
          setIsPlaying(false);
          setCommentTimestamp(videoRef.current.currentTime);
          setNewCommentText('');
      }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !projectId || !feedbackItemId || !user || commentTimestamp === null) return;

    try {
      await addComment(projectId, feedbackItemId, {
        authorId: user.id,
        commentText: newCommentText,
        timestamp: commentTimestamp
      });
      setNewCommentText('');
      setCommentTimestamp(null);
      // Optionally resume play?
    } catch (error) {
      console.error("Failed to add comment", error);
    }
  };
  
  const handleResolveToggle = async (commentId: string, currentStatus: boolean) => {
      if (!projectId || !feedbackItemId) return;
      await toggleCommentResolved(projectId, feedbackItemId, commentId, currentStatus);
  };

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) return <div className="p-10 text-center text-text-secondary">Loading...</div>;
  if (!feedbackItem) return <div className="p-10 text-center text-text-secondary">Feedback Item Not Found</div>;

  return (
    <div className="flex h-[calc(100vh-100px)] overflow-hidden">
      {/* Left Column: Video Player */}
      <div className="flex-1 bg-black flex flex-col justify-center relative p-4">
        <div className="relative w-full h-full flex flex-col justify-center">
             <video 
                ref={videoRef}
                src={feedbackItem.assetUrl} 
                className="w-full max-h-[calc(100%-60px)] object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onClick={togglePlay}
            />
            
            {/* Custom Controls / Seek Bar */}
            <div className="h-12 bg-gray-900 flex items-center px-4 gap-4 mt-2 rounded">
                 <button onClick={togglePlay} className="text-white hover:text-primary">
                    {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                 </button>
                 
                 <div className="text-xs text-white w-20 text-center">
                     {formatTime(currentTime)} / {formatTime(duration)}
                 </div>

                 <div className="flex-1 relative h-2 bg-gray-700 rounded cursor-pointer group"
                      onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const pos = (e.clientX - rect.left) / rect.width;
                          handleSeek(pos * duration);
                      }}
                 >
                     {/* Progress Bar */}
                     <div 
                        className="absolute top-0 left-0 h-full bg-primary rounded pointer-events-none" 
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                     />
                     
                     {/* Comment Markers */}
                     {comments.map(comment => (
                         comment.timestamp !== undefined && !comment.resolved && (
                             <div 
                                key={comment.id}
                                className="absolute top-0 w-1 h-full bg-yellow-400 z-10 hover:h-4 hover:-top-1 transition-all"
                                style={{ left: `${(comment.timestamp / duration) * 100}%` }}
                                title={comment.commentText}
                             />
                         )
                     ))}
                 </div>
                 
                 <button 
                    onClick={startComment}
                    className="bg-primary text-background px-3 py-1 text-xs font-bold rounded hover:bg-primary-hover whitespace-nowrap"
                 >
                     + Add Comment
                 </button>
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
        {commentTimestamp !== null && (
            <div className="p-4 bg-primary/10 border-b border-primary/20">
                <div className="flex justify-between items-center mb-2">
                     <h3 className="text-sm font-semibold text-primary">Comment at {formatTime(commentTimestamp)}</h3>
                </div>
                <form onSubmit={handleAddComment}>
                    <textarea 
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        placeholder="Type your feedback..."
                        className="w-full p-2 rounded bg-glass-light border border-border-color text-sm mb-2 focus:ring-1 focus:ring-primary outline-none"
                        rows={3}
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                         <button 
                            type="button" 
                            onClick={() => setCommentTimestamp(null)}
                            className="px-3 py-1 text-xs text-text-secondary hover:text-text-primary"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="px-3 py-1 bg-primary text-background text-xs font-bold rounded hover:bg-primary-hover"
                        >
                            Post
                        </button>
                    </div>
                </form>
            </div>
        )}

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {comments.length === 0 ? (
                <p className="text-center text-text-secondary text-sm">No comments yet.</p>
            ) : (
                comments.map((comment) => (
                    <div 
                        key={comment.id} 
                        className={`p-3 rounded-lg border bg-glass-light border-border-color hover:border-primary/50 transition-all cursor-pointer`}
                        onClick={() => comment.timestamp !== undefined && handleSeek(comment.timestamp)}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-xs text-primary bg-primary/20 px-2 py-0.5 rounded mr-2">
                                {comment.timestamp !== undefined ? formatTime(comment.timestamp) : '0:00'}
                            </span>
                            <span className="text-xs text-text-secondary">{new Date(comment.createdAt?.seconds * 1000).toLocaleString()}</span>
                        </div>
                        <p className={`text-sm text-text-primary mb-2 ${comment.resolved ? 'line-through text-text-secondary' : ''}`}>{comment.commentText}</p>
                        
                         <div className="flex justify-end items-center mt-2">
                             <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleResolveToggle(comment.id, comment.resolved);
                                }}
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

export default FeedbackVideoDetailPage;
