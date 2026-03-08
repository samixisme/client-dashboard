import React, { useMemo } from 'react';
import {
  Upload, Trash2, Share2, Edit3, Move, Tag, MessageSquare,
  Clock, Filter, LucideIcon
} from 'lucide-react';
import { formatRelativeTime } from '../../types/drive';
import { useActivityLog, ActivityAction, FileActivity } from '../../hooks/useActivityLog';

// ─── Action icon & color mapping ──────────────────────────────────────────────

const ACTION_CONFIG: Record<ActivityAction, { icon: LucideIcon; label: string; color: string }> = {
  upload:  { icon: Upload,        label: 'Uploaded',  color: 'text-emerald-400' },
  delete:  { icon: Trash2,        label: 'Deleted',   color: 'text-red-400' },
  rename:  { icon: Edit3,         label: 'Renamed',   color: 'text-amber-400' },
  share:   { icon: Share2,        label: 'Shared',    color: 'text-blue-400' },
  move:    { icon: Move,          label: 'Moved',     color: 'text-violet-400' },
  tag:     { icon: Tag,           label: 'Tagged',    color: 'text-cyan-400' },
  comment: { icon: MessageSquare, label: 'Commented', color: 'text-pink-400' },
};

const FILTER_OPTIONS: Array<{ value: ActivityAction | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'upload', label: 'Uploads' },
  { value: 'delete', label: 'Deletes' },
  { value: 'move', label: 'Moves' },
  { value: 'rename', label: 'Renames' },
  { value: 'share', label: 'Shares' },
  { value: 'tag', label: 'Tags' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface ActivityLogProps {
  projectId?: string;
  maxItems?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

const ActivityLog: React.FC<ActivityLogProps> = ({
  projectId = 'default',
  maxItems = 50,
}) => {
  const {
    filteredActivities,
    isLoading,
    filter,
    setFilter,
  } = useActivityLog(projectId);

  const displayActivities = useMemo(
    () => filteredActivities.slice(0, maxItems),
    [filteredActivities, maxItems]
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
          <Clock size={14} className="text-primary" />
          Activity
        </h3>

        {/* Filter dropdown */}
        <div className="flex items-center gap-1">
          <Filter size={11} className="text-text-secondary/50" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as ActivityAction | 'all')}
            className="bg-glass border border-border-color rounded-md px-1.5 py-0.5 text-[10px] text-text-secondary focus:outline-none focus:border-primary/50"
            aria-label="Filter activity by type"
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Activity list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-8 rounded-lg bg-glass/30 animate-pulse" />
          ))}
        </div>
      ) : displayActivities.length === 0 ? (
        <div className="text-xs text-text-secondary/50 italic py-4 text-center">
          No activity yet
        </div>
      ) : (
        <div className="space-y-0.5 max-h-100 overflow-y-auto pr-1">
          {displayActivities.map((activity: FileActivity) => {
            const config = ACTION_CONFIG[activity.action] || ACTION_CONFIG.upload;
            const IconComponent = config.icon;
            return (
              <div
                key={activity.id}
                className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-glass-light/30 transition-colors group"
              >
                <div className={`mt-0.5 p-1 rounded-md bg-glass/40 ${config.color}`}>
                  <IconComponent size={11} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-text-primary truncate">
                    <span className={`font-medium ${config.color}`}>{config.label}</span>{' '}
                    <span className="text-text-secondary">{activity.fileName}</span>
                  </div>
                  <div className="text-[10px] text-text-secondary/50 flex items-center gap-1.5">
                    <span>{activity.userName || 'System'}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(activity.timestamp)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
