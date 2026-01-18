import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import FeedbackCanvas from './FeedbackCanvas';
import FeedbackSidebar from './FeedbackSidebar';
import { getFeedbackItems } from '../../utils/feedbackUtils';
import { FeedbackComment } from '../../types';

export type Breakpoint = 'desktop' | 'notebook' | 'tablet' | 'phone';
export type InteractionMode = 'navigate' | 'comment';
export type SidebarDock = 'right' | 'bottom';

const FeedbackItemPage = () => {
  const { projectId, itemId } = useParams<{ projectId: string; itemId: string }>();
  const { data, forceUpdate } = useData();
  
  // Task 1.1: Breakpoint Switcher State
  const [activeBreakpoint, setActiveBreakpoint] = useState<Breakpoint>('desktop');
  
  // Task 1.2: Interaction Mode State
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('comment');
  
  // Task 3.1: Sidebar Docking State
  const [sidebarDock, setSidebarDock] = useState<SidebarDock>('right');
  
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch item data
  useEffect(() => {
    if (projectId && itemId) {
      getFeedbackItems(projectId).then((items) => {
        const foundItem = items.find((i: any) => i.id === itemId);
        setItem(foundItem);
        setLoading(false);
      });
    }
  }, [projectId, itemId]);

  // Task 3.2: Handler for "Go to Page" deep link
  const handleGoToPage = (url: string, device: string) => {
    if (item && item.type === 'website') {
        setItem((prev: any) => ({ ...prev, url })); 
    }
    if (['desktop', 'notebook', 'tablet', 'phone'].includes(device)) {
        setActiveBreakpoint(device as Breakpoint);
    }
    setInteractionMode('navigate');
  };

  // Filter comments for the sidebar
  const sidebarComments = (data.feedbackComments || []).filter((c: any) => c.targetId === itemId);

  if (loading) return <div className="p-10 text-center text-text-secondary">Loading...</div>;
  if (!item) return <div className="p-10 text-center text-text-secondary">Item not found</div>;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header / Toolbar */}
      <header className="h-16 border-b border-border-color bg-glass flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-lg text-text-primary">{item.name}</h1>
          
          {/* Task 1.1: Breakpoint Switcher UI */}
          <div className="flex bg-glass-light rounded-lg p-1 border border-border-color">
            {(['desktop', 'notebook', 'tablet', 'phone'] as Breakpoint[]).map((bp) => (
              <button
                key={bp}
                onClick={() => setActiveBreakpoint(bp)}
                className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all ${
                  activeBreakpoint === bp 
                    ? 'bg-primary text-background shadow-sm' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {bp}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
           {/* Task 1.2: Interaction Mode Toggle */}
           <div className="flex bg-glass-light rounded-lg p-1 border border-border-color">
            <button
              onClick={() => setInteractionMode('navigate')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                interactionMode === 'navigate' 
                  ? 'bg-primary text-background shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Navigate
            </button>
            <button
              onClick={() => setInteractionMode('comment')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                interactionMode === 'comment' 
                  ? 'bg-primary text-background shadow-sm' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Comment
            </button>
          </div>

          {/* Task 3.1: Sidebar Dock Toggle */}
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span className="hidden md:inline">Dock:</span>
            <button onClick={() => setSidebarDock('right')} className={`p-1 rounded ${sidebarDock === 'right' ? 'text-primary' : 'hover:text-text-primary'}`} title="Right Dock">Right</button>
            <button onClick={() => setSidebarDock('bottom')} className={`p-1 rounded ${sidebarDock === 'bottom' ? 'text-primary' : 'hover:text-text-primary'}`} title="Bottom Dock">Bottom</button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className={`flex flex-1 overflow-hidden ${sidebarDock === 'bottom' ? 'flex-col' : 'flex-row'}`}>
        
        {/* Canvas Area */}
        <div className="flex-1 bg-glass-light relative overflow-hidden flex items-center justify-center p-8">
          <FeedbackCanvas 
            item={item}
            activeBreakpoint={activeBreakpoint}
            interactionMode={interactionMode}
            projectId={projectId || ''}
          />
        </div>

        {/* Sidebar */}
        <FeedbackSidebar 
            view="comments"
            comments={sidebarComments}
            onCommentClick={(c) => console.log('Clicked comment', c)}
            onClose={() => {}}
            onDelete={(id) => {
                const idx = data.feedbackComments.findIndex((c: any) => c.id === id);
                if (idx > -1) { data.feedbackComments.splice(idx, 1); forceUpdate(); }
            }}
            onResolve={(id) => { const c = data.feedbackComments.find((c: any) => c.id === id); if (c) { c.status = 'Resolved'; forceUpdate(); } }}
            position={sidebarDock}
            onGoToPage={handleGoToPage}
        />
      </div>
    </div>
  );
};

export default FeedbackItemPage;