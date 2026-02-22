import React from 'react';
import { DriveStatsResponse, formatFileSize } from '../../types/drive';

interface StorageUsageProps {
  stats: DriveStatsResponse | null;
}

const StorageUsage: React.FC<StorageUsageProps> = ({ stats }) => {
  if (!stats) return null;

  const percent = Math.max(0, Math.min(stats.percentUsed, 100));
  const barColor =
    percent >= 90 ? 'bg-red-500' :
    percent >= 75 ? 'bg-yellow-500' :
    'bg-primary';

  return (
    <div className="flex items-center gap-3 text-xs text-text-secondary">
      <svg className="w-4 h-4 flex-shrink-0 text-text-secondary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 2.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125m0 4.875c0 2.278 3.694 4.125 8.25 4.125s8.25-1.847 8.25-4.125" />
      </svg>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex-1 h-1.5 bg-glass rounded-full overflow-hidden min-w-[60px]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="whitespace-nowrap flex-shrink-0">
          {formatFileSize(stats.dailyUploadBytes)} / {formatFileSize(stats.dailyUploadLimit)} daily
        </span>
      </div>
    </div>
  );
};

export default StorageUsage;
