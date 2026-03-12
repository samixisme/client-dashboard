/**
 * ResultCard Component
 *
 * Displays a single search result with type-specific icon,
 * highlighted title/snippet, metadata, and navigation.
 */

import React from 'react';
import { getHighlightedSegments, getFieldMatchPositions } from '../../utils/searchHighlight';
import type { SearchHit } from '../../hooks/useSearch';
import {
  Folder,
  CheckSquare,
  Palette,
  MessageSquare,
  FileText,
  Users,
  HardDrive,
  type LucideIcon,
} from 'lucide-react';

// ── Type → Icon mapping ─────────────────────────────────────────────

const INDEX_META: Record<
  string,
  { icon: LucideIcon; label: string; color: string; titleField: string; snippetField: string }
> = {
  projects: {
    icon: Folder,
    label: 'Project',
    color: 'var(--primary)',
    titleField: 'name',
    snippetField: 'description',
  },
  tasks: {
    icon: CheckSquare,
    label: 'Task',
    color: '#10b981',
    titleField: 'title',
    snippetField: 'description',
  },
  brands: {
    icon: Palette,
    label: 'Brand',
    color: '#f59e0b',
    titleField: 'name',
    snippetField: 'description',
  },
  feedback_items: {
    icon: MessageSquare,
    label: 'Feedback',
    color: '#8b5cf6',
    titleField: 'title',
    snippetField: 'content',
  },
  invoices: {
    icon: FileText,
    label: 'Invoice',
    color: '#ec4899',
    titleField: 'number',
    snippetField: 'clientName',
  },
  clients: {
    icon: Users,
    label: 'Client',
    color: '#06b6d4',
    titleField: 'name',
    snippetField: 'company',
  },
  drive_files: {
    icon: HardDrive,
    label: 'File',
    color: '#64748b',
    titleField: 'name',
    snippetField: 'description',
  },
};

export interface ResultCardProps {
  hit: SearchHit;
  indexUid: string;
  onClick: () => void;
  isSelected?: boolean;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  hit,
  indexUid,
  onClick,
  isSelected = false,
}) => {
  const meta = INDEX_META[indexUid] || INDEX_META.projects;
  const Icon = meta.icon;

  const title = hit[meta.titleField] || hit.name || hit.title || 'Untitled';
  const snippet = hit[meta.snippetField] || '';

  const titlePositions = getFieldMatchPositions(hit._matchesPosition, meta.titleField);
  const snippetPositions = getFieldMatchPositions(hit._matchesPosition, meta.snippetField);

  const highlightedTitleSegments = getHighlightedSegments(title, titlePositions, 120);
  const highlightedSnippetSegments = snippet
    ? getHighlightedSegments(snippet, snippetPositions, 160)
    : [];

  // Status badge
  const status = hit.status as string | undefined;

  return (
    <button
      className={`result-card ${isSelected ? 'result-card--selected' : ''}`}
      onClick={onClick}
      type="button"
      role="option"
      aria-selected={isSelected}
    >
      <div className="result-card__icon" style={{ color: meta.color }}>
        <Icon size={18} />
      </div>

      <div className="result-card__content">
        <div className="result-card__header">
          <span className="result-card__title">
            {highlightedTitleSegments.map((segment, idx) =>
              segment.isMatch ? (
                <mark key={idx} className="search-highlight">
                  {segment.text}
                </mark>
              ) : (
                <React.Fragment key={idx}>{segment.text}</React.Fragment>
              )
            )}
          </span>
          <span className="result-card__type">{meta.label}</span>
        </div>

        {highlightedSnippetSegments.length > 0 && (
          <p className="result-card__snippet">
            {highlightedSnippetSegments.map((segment, idx) =>
              segment.isMatch ? (
                <mark key={idx} className="search-highlight">
                  {segment.text}
                </mark>
              ) : (
                <React.Fragment key={idx}>{segment.text}</React.Fragment>
              )
            )}
          </p>
        )}

        {status && (
          <div className="result-card__meta">
            <span className={`result-card__status result-card__status--${status}`}>
              {status}
            </span>
          </div>
        )}
      </div>
    </button>
  );
};
