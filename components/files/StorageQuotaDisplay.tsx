import React from 'react';
import { HardDrive, RefreshCw, AlertTriangle } from 'lucide-react';
import { formatFileSize } from '../../types/drive';
import { useStorageQuota } from '../../hooks/useStorageQuota';

// ─── Props ────────────────────────────────────────────────────────────────────

interface StorageQuotaDisplayProps {
  /** Breakdown data from file list (calculated client-side) */
  breakdown?: { images: number; videos: number; documents: number; archives: number; other: number };
}

// ─── Component ────────────────────────────────────────────────────────────────

const StorageQuotaDisplay: React.FC<StorageQuotaDisplayProps> = ({ breakdown }) => {
  const { quota, isLoading, refreshQuota } = useStorageQuota();

  if (isLoading && !quota) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-glass/40 border border-border-color animate-pulse">
        <HardDrive size={14} className="text-text-secondary/50" />
        <div className="h-3 w-24 bg-glass/60 rounded" />
      </div>
    );
  }

  if (!quota) return null;

  const { used, total, percentUsed } = quota;

  // Color thresholds
  const barColor =
    percentUsed > 90 ? 'bg-red-500' :
    percentUsed > 80 ? 'bg-amber-500' :
    'bg-emerald-500';

  const warningLevel =
    percentUsed > 90 ? 'critical' :
    percentUsed > 80 ? 'warning' :
    null;

  return (
    <div className="space-y-2">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
          <HardDrive size={14} className="text-primary" />
          Storage
        </h3>
        <button
          onClick={refreshQuota}
          disabled={isLoading}
          className="p-1 rounded-lg hover:bg-glass-light transition-colors text-text-secondary hover:text-primary disabled:opacity-30"
          aria-label="Refresh storage quota"
        >
          <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 w-full rounded-full bg-glass/40 border border-border-color overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(percentUsed, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-text-secondary/60">
          <span>{formatFileSize(used)} used</span>
          <span>{total > 0 ? `${formatFileSize(total)} total` : 'Unlimited'}</span>
        </div>
      </div>

      {/* Warning */}
      {warningLevel && (
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium ${
          warningLevel === 'critical'
            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
        }`}>
          <AlertTriangle size={11} />
          {warningLevel === 'critical'
            ? 'Storage almost full — consider cleaning up'
            : 'Storage quota above 80%'
          }
        </div>
      )}

      {/* Breakdown */}
      {breakdown && (
        <div className="grid grid-cols-5 gap-1 text-center">
          {Object.entries(breakdown).map(([type, bytes]) => (
            <div key={type} className="px-1 py-1 rounded-md bg-glass/20">
              <div className="text-[9px] text-text-secondary/50 capitalize">{type}</div>
              <div className="text-[10px] text-text-secondary font-medium">{formatFileSize(bytes)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StorageQuotaDisplay;
