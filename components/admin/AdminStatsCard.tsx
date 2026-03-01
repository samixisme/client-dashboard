import React, { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AdminStatsCardProps {
  /** Lucide icon element, e.g. <Users className="h-5 w-5" /> */
  icon: ReactNode;
  /** Large headline metric, e.g. "1,284" or "$42,500" */
  value: string | number;
  /** Label below the metric */
  label: string;
  /**
   * Trend percentage as a number.
   * Positive = green up arrow, negative = red down arrow, 0/undefined = grey dash.
   */
  trend?: number;
  /** Optional subtitle, e.g. "12 active / 3 archived" */
  subtitle?: string;
}

export function AdminStatsCard({ icon, value, label, trend, subtitle }: AdminStatsCardProps) {
  const trendColor =
    trend === undefined || trend === 0
      ? 'text-text-secondary'
      : trend > 0
      ? 'text-green-400'
      : 'text-red-400';

  const TrendIcon =
    trend === undefined || trend === 0
      ? Minus
      : trend > 0
      ? TrendingUp
      : TrendingDown;

  return (
    <div className="bg-glass border border-border-color rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-text-primary">{value}</p>
        <p className="text-sm text-text-secondary mt-0.5">{label}</p>
        {subtitle && (
          <p className="text-xs text-text-secondary mt-1 opacity-70">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
