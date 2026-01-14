
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getFeedbackItem, subscribeToComments, addComment, toggleCommentResolved } from '../utils/feedbackUtils';
import { FeedbackItem, FeedbackItemComment } from '../types';
import { useData } from '../contexts/DataContext';
import FeedbackSidebar from '../components/feedback/FeedbackSidebar';
import { PlayIcon } from '../components/icons/PlayIcon';
import { PauseIcon } from '../components/icons/PauseIcon';
import { ArrowRightIcon } from '../components/icons/ArrowRightIcon';
import { CommentsIcon } from '../components/icons/CommentsIcon';
import { ActivityIcon } from '../components/icons/ActivityIcon';

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

  // Sidebar & Interaction State
  const [newCommentText, setNewCommentText] = useState('');
  const [commentTimestamp, setCommentTimestamp] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarView, setSidebarView] = useState<'comments' | 'activity'>('comments');
  const [sidebarPosition, setSidebarPosition] = useState<'right' | 'bottom'>('right');

  useEffect(() => {
    if (projectId && feedbackItemId) {
      getFeedbackItem(projectId, feedbackItemId).then((item) => {
        setFeedbackItem(item);
        setLoading(false);
      });

      const unsubscribe = subscribeToComments(projectId, feedbackItemId, (fetchedComments) => {
        // Sort by timestamp for video
        const sortedComments = fetchedComments.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setComments(sortedComments);
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
          setIsSidebarOpen(true);
          setSidebarView('comments');
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
    } catch (error) {
      console.error("Failed to add comment", error);
    }
  };

  const handleCommentClick = (comment: FeedbackItemComment) => {
      if (comment.timestamp !== undefined) {
          handleSeek(comment.timestamp);
      }
  };

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) return <div className="p-10 text-center text-text-secondary">Loading...</div>;
  if (!feedbackItem) return <div className="p-10 text-center text-text-secondary">Feedback Item Not Found</div>;

  return (
    <div className={`flex overflow-hidden relative ${sidebarPosition === 'bottom' ? 'flex-col h-[calc(100vh-100px)]' : 'flex-row h-[calc(100vh-100px)]'}`}>
      
      {/* 1. Main Viewer (Video) */}
      <div className="flex-1 bg-black flex flex-col justify-center relative p-4 overflow-hidden">
        <div className="relative w-full h-full flex flex-col justify-center">
             <video 
                ref={videoRef}
                src={feedbackItem.assetUrl} 
                className="w-full max-h-[calc(100%-60px)] object-contain mx-auto"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onClick={togglePlay}
            />
            
            {/* Custom Controls / Seek Bar */}
            <div className="h-12 bg-gray-900 flex items-center px-4 gap-4 mt-2 rounded max-w-4xl mx-auto w-full">
                 <button onClick={togglePlay} className="text-white hover:text-primary">
                    {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                 </button>
                 
                 <div className="text-xs text-white w-20 text-center font-mono">
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

        {/* Toolbar Overlay */}
        <div className="absolute top-4 left-4 z-20 flex gap-2">
             <button onClick={() => setSidebarPosition(p => p === 'right' ? 'bottom' : 'right')} className="p-2 bg-glass/80 rounded-lg text-white hover:bg-glass border border-white/10" title="Rotate Layout">
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
            <div className="truncate pr-2">
                <h2 className="font-bold text-text-primary truncate">{feedbackItem.name}</h2>
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
        {commentTimestamp !== null && (
            <div className="p-4 bg-primary/10 border-b border-primary/20 flex-shrink-0 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-2">
                     <h3 className="text-sm font-semibold text-primary">Comment at {formatTime(commentTimestamp)}</h3>
                     <button onClick={() => setCommentTimestamp(null)} className="text-xs text-text-secondary hover:text-text-primary">Cancel</button>
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
                    <div className="flex justify-end">
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

        {/* List Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
            <FeedbackSidebar 
                view={sidebarView}
                comments={comments}
                onCommentClick={handleCommentClick}
                onClose={() => {}} // Controlled by outer header
                position={sidebarPosition}
            />
        </div>
      </div>
    </div>
  );
};

export default FeedbackVideoDetailPage;
