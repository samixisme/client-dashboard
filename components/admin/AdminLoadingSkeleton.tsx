import React from 'react';

interface AdminLoadingSkeletonProps {
  /** Number of skeleton rows/cards to render (default: 5) */
  rows?: number;
  /** 'table' renders row skeletons, 'cards' renders stat card skeletons (default: 'table') */
  variant?: 'table' | 'cards';
}

export function AdminLoadingSkeleton({ rows = 5, variant = 'table' }: AdminLoadingSkeletonProps) {
  if (variant === 'cards') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="bg-glass border border-border-color rounded-xl p-5 flex flex-col gap-3 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-glass-light" />
              <div className="w-10 h-4 rounded bg-glass-light" />
            </div>
            <div>
              <div className="w-20 h-7 rounded bg-glass-light mb-1.5" />
              <div className="w-28 h-4 rounded bg-glass-light" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2 animate-pulse">
      <div className="flex gap-4 px-4 py-2">
        {[40, 24, 16, 12].map((w, i) => (
          <div key={i} className="h-4 rounded bg-glass-light" style={{ width: `${w}%` }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 px-4 py-3 bg-glass border border-border-color rounded-lg"
        >
          <div className="flex items-center gap-3" style={{ width: '40%' }}>
            <div className="w-8 h-8 rounded-full bg-glass-light flex-shrink-0" />
            <div className="w-full h-4 rounded bg-glass-light" />
          </div>
          <div className="h-4 rounded bg-glass-light" style={{ width: '24%' }} />
          <div className="h-4 rounded bg-glass-light" style={{ width: '16%' }} />
          <div className="h-4 rounded bg-glass-light" style={{ width: '12%' }} />
        </div>
      ))}
    </div>
  );
}
