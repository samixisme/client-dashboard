import React, { useState, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import CommentPopover from './CommentPopover';
import { Breakpoint, InteractionMode } from './FeedbackItemPage';
import { FeedbackComment } from '../../types';

interface FeedbackCanvasProps {
  item: any;
  activeBreakpoint: Breakpoint;
  interactionMode: InteractionMode;
  projectId: string;
}

const BREAKPOINT_WIDTHS = {
  desktop: '100%',
  notebook: '1440px',
  tablet: '768px',
  phone: '375px',
};

const FeedbackCanvas: React.FC<FeedbackCanvasProps> = ({ item, activeBreakpoint, interactionMode, projectId }) => {
  const { data, forceUpdate } = useData();
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [tempPin, setTempPin] = useState<{x: number, y: number} | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Task 1.2: Filter comments based on device breakpoint
  const pins = (data.feedbackComments || []).filter((c: any) => 
    c.targetId === item.id && 
    (!c.deviceView || c.deviceView === activeBreakpoint)
  );

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (interactionMode === 'navigate') return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate percentage coordinates
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    setTempPin({ x: xPercent, y: yPercent });
    setActivePinId(null);
  };

  const handlePinClick = (e: React.MouseEvent, pinId: string) => {
    e.stopPropagation();
    setActivePinId(pinId);
    setTempPin(null);
  };

  const closePopover = () => {
      setActivePinId(null);
      setTempPin(null);
  };

  const activePin = (data.feedbackComments || []).find((p: any) => p.id === activePinId);

  return (
    <div 
      className="relative shadow-2xl transition-all duration-300 bg-white"
      style={{ 
        width: BREAKPOINT_WIDTHS[activeBreakpoint],
        height: activeBreakpoint === 'desktop' ? '100%' : 'auto',
        aspectRatio: activeBreakpoint === 'phone' ? '9/19.5' : activeBreakpoint === 'tablet' ? '3/4' : 'auto',
        overflow: 'hidden'
      }}
    >
      <div 
        ref={containerRef}
        className={`w-full h-full relative ${interactionMode === 'navigate' ? 'cursor-auto' : 'cursor-crosshair'}`}
        onClick={handleCanvasClick}
      >
        {item.type === 'website' ? (
          <iframe 
            src={item.assetUrl || item.url} 
            className={`w-full h-full border-none ${interactionMode === 'navigate' ? 'pointer-events-auto' : 'pointer-events-none'}`}
            title="Feedback Content"
          />
        ) : (
          <img 
            src={item.assetUrl} 
            alt="Feedback Content" 
            className="w-full h-full object-contain pointer-events-none select-none"
          />
        )}

        {/* Render Pins */}
        {pins.map((pin: any) => (
          <div
            key={pin.id}
            className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg cursor-pointer transform transition-transform hover:scale-110 z-10
                ${pin.status === 'Resolved' ? 'opacity-50 bg-green-500' : 'opacity-100 bg-primary'}
            `}
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            onClick={(e) => handlePinClick(e, pin.id)}
          >
            {pin.pin_number}
          </div>
        ))}

        {/* Popover for NEW pin */}
        {tempPin && (
            <div ref={contentRef} className="absolute inset-0 pointer-events-none z-50">
                <div className="pointer-events-auto">
                    <CommentPopover 
                        comment={null}
                        coords={{ x: (tempPin.x / 100) * (containerRef.current?.offsetWidth || 0), y: (tempPin.y / 100) * (containerRef.current?.offsetHeight || 0) }}
                        contentRef={containerRef}
                        zoom={1}
                        onClose={closePopover}
                        onSubmit={(text, details) => {
                            // Task 1.2: Review Order Pin Numbering
                            const existingPins = pins.filter((p: any) => p.pageUrl === (item.url || '/') && p.deviceView === activeBreakpoint);
                            const maxPinNumber = existingPins.reduce((max: number, p: any) => Math.max(max, p.pin_number || 0), 0);
                            
                            const newPin: FeedbackComment = {
                                id: `comment-${Date.now()}`,
                                targetId: item.id,
                                projectId,
                                x: tempPin.x,
                                y: tempPin.y,
                                pin_number: maxPinNumber + 1,
                                status: 'Active',
                                deviceView: activeBreakpoint,
                                pageUrl: item.url || '/',
                                reporterId: 'user-1',
                                comment: text,
                                replies: [],
                                createdAt: new Date().toISOString(),
                                targetType: item.type,
                                dueDate: details?.dueDate
                            };
                            if (!data.feedbackComments) data.feedbackComments = [];
                            data.feedbackComments.push(newPin);
                            forceUpdate();
                            closePopover();
                            setActivePinId(newPin.id);
                        }}
                    />
                </div>
            </div>
        )}

        {/* Popover for EXISTING pin */}
        {activePin && (
            <div ref={contentRef} className="absolute inset-0 pointer-events-none z-50">
                <div className="pointer-events-auto">
                    <CommentPopover 
                        comment={activePin}
                        coords={{ x: (activePin.x / 100) * (containerRef.current?.offsetWidth || 0), y: (activePin.y / 100) * (containerRef.current?.offsetHeight || 0) }}
                        contentRef={containerRef}
                        zoom={1}
                        onClose={closePopover}
                        onSubmit={() => {}} // Not used for existing comments
                        onUpdate={(id, updates) => { Object.assign(activePin, updates); forceUpdate(); }}
                        onResolve={() => { activePin.status = 'Resolved'; forceUpdate(); }}
                        onDelete={(id) => {
                            const idx = data.feedbackComments.findIndex((c: any) => c.id === id);
                            if (idx > -1) data.feedbackComments.splice(idx, 1);
                            forceUpdate();
                            closePopover();
                        }}
                    />
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackCanvas;