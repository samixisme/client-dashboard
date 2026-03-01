import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { AdminLoadingSkeleton } from '../AdminLoadingSkeleton';
import { AdminEmptyState } from '../AdminEmptyState';

interface AIGeneratorPanelProps {
  title: string;
  icon: React.ReactNode;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  loading: boolean;
  results: any;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  children: React.ReactNode;
  renderResults: () => React.ReactNode;
}

export const AIGeneratorPanel: React.FC<AIGeneratorPanelProps> = ({
  title, icon, emptyIcon, emptyTitle, emptyDescription,
  loading, results, onSubmit, submitLabel, children, renderResults,
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div className="bg-glass border border-border-color rounded-xl p-6 h-fit">
      <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      <form onSubmit={onSubmit} className="space-y-4">
        {children}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-text-primary font-medium rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {loading ? 'Generating...' : submitLabel}
        </button>
      </form>
    </div>

    <div className="flex flex-col">
      {loading ? (
        <AdminLoadingSkeleton variant="table" rows={4} />
      ) : results ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {renderResults()}
        </div>
      ) : (
        <AdminEmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
        />
      )}
    </div>
  </div>
);
