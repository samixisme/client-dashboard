import React, { useEffect, useState, useCallback } from 'react';
import FeedbackSidebar from '../../components/feedback/FeedbackSidebar';

// Function to generate a unique CSS selector for an element
const getCssSelector = (el: HTMLElement): string => {
  if (!(el instanceof Element)) return '';
  const path: string[] = [];
  while (el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.nodeName.toLowerCase();
    if (el.id) {
      selector += '#' + el.id;
      path.unshift(selector);
      break;
    } else {
      let sib: Element | null = el;
      let nth = 1;
      while (sib = sib.previousElementSibling) {
        if (sib.nodeName.toLowerCase() === selector) nth++;
      }
      if (nth !== 1) selector += `:nth-of-type(${nth})`;
    }
    path.unshift(selector);
    el = el.parentNode as HTMLElement;
  }
  return path.join(' > ');
};

interface Comment {
  id: number;
  selector: string;
  text: string;
  position: { top: number; left: number } | null;
}

const FeedbackTool = () => {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [feedbackItemId, setFeedbackItemId] = useState<string | null>(null);
  const [isCommenting, setIsCommenting] = useState(false);
  const [activeSelector, setActiveSelector] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);

  // Effect to read script attributes
  useEffect(() => {
    const script = document.querySelector('script[src*="feedback.js"]');
    if (script) {
      setProjectId(script.getAttribute('data-project-id'));
      setFeedbackItemId(script.getAttribute('data-feedback-id'));
    }
  }, []);

  // Effect to handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'c' && e.altKey) {
        setIsCommenting(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Effect to handle page click for commenting
  const handlePageClick = useCallback((e: MouseEvent) => {
    if (isCommenting) {
      e.preventDefault();
      e.stopPropagation();
      const clickedEl = e.target as HTMLElement;
      setActiveSelector(getCssSelector(clickedEl));
      setIsCommenting(false);
    }
  }, [isCommenting]);

  useEffect(() => {
    if (isCommenting) {
      document.body.style.cursor = 'crosshair';
      document.addEventListener('click', handlePageClick, true);
    } else {
      document.body.style.cursor = 'default';
      document.removeEventListener('click', handlePageClick, true);
    }
    return () => {
      document.body.style.cursor = 'default';
      document.removeEventListener('click', handlePageClick, true);
    };
  }, [isCommenting, handlePageClick]);

  // Real-time tracking of comment bubble positions
  useEffect(() => {
    const updatePositions = () => {
      setComments(prevComments =>
        prevComments.map(comment => {
          const el = document.querySelector(comment.selector);
          if (el) {
            const rect = el.getBoundingClientRect();
            return {
              ...comment,
              position: {
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
              },
            };
          }
          return { ...comment, position: null }; // Hide if element not found
        })
      );
    };

    window.addEventListener('scroll', updatePositions);
    window.addEventListener('resize', updatePositions);
    updatePositions(); // Initial position calculation

    return () => {
      window.removeEventListener('scroll', updatePositions);
      window.removeEventListener('resize', updatePositions);
    };
  }, [comments.length]); // Rerun when a new comment is added

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim() && activeSelector) {
      setComments([
        ...comments,
        {
          id: Date.now(),
          selector: activeSelector,
          text: commentText,
          position: null, // Position will be calculated by the effect
        },
      ]);
      setCommentText('');
      setActiveSelector(null);
    }
  };

  if (!projectId || !feedbackItemId) {
    return null;
  }

  return (
    <>
      {/* Render comment bubbles */}
      {comments.map(comment =>
        comment.position && (
          <div
            key={comment.id}
            style={{
              position: 'absolute',
              top: `${comment.position.top}px`,
              left: `${comment.position.left}px`,
              zIndex: 1000,
              width: '32px',
              height: '32px',
              background: 'blue',
              borderRadius: '50%',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title={comment.text}
          >
            {comment.id}
          </div>
        )
      )}

      {/* Control Panel / Sidebar */}
      <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 1001, background: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <button onClick={() => setIsCommenting(prev => !prev)} style={{ width: '100%', marginBottom: '10px' }}>
          {isCommenting ? 'Cancel' : 'Add Comment (Alt+C)'}
        </button>

        {activeSelector && (
          <form onSubmit={handleCommentSubmit}>
            <p style={{ fontSize: '12px', wordBreak: 'break-all' }}>Selected: {activeSelector}</p>
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Leave a comment..."
              rows={3}
              style={{ width: '100%', margin: '5px 0' }}
              autoFocus
            />
            <button type="submit">Submit</button>
          </form>
        )}
      </div>
    </>
  );
};

export default FeedbackTool;
