import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SocialStatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  sparklineData?: number[];
  loading?: boolean;
}

const SocialStatCard: React.FC<SocialStatCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  sparklineData,
  loading = false,
}) => {
  const formatChange = (val: number) => {
    const abs = Math.abs(val);
    return val > 0 ? `+${abs}%` : val < 0 ? `-${abs}%` : '0%';
  };

  const getChangeColor = (val: number) => {
    if (val > 0) return 'text-lime-400';
    if (val < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getChangeIcon = (val: number) => {
    if (val > 0) return <TrendingUp className="h-4 w-4" />;
    if (val < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length === 0) return null;

    const max = Math.max(...sparklineData);
    const min = Math.min(...sparklineData);
    const range = max - min || 1;

    const points = sparklineData.map((val, idx) => {
      const x = (idx / (sparklineData.length - 1)) * 100;
      const y = 100 - ((val - min) / range) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className="absolute bottom-0 right-0 w-24 h-12 opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-lime-400"
        />
      </svg>
    );
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-glass/40 backdrop-blur-xl border border-white/10 p-6 hover:bg-glass/60 transition-all duration-300 group hover:border-lime-500/30 hover:shadow-lg hover:shadow-lime-500/10">
      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-white/10 rounded w-24"></div>
          <div className="h-8 bg-white/10 rounded w-32"></div>
          <div className="h-3 bg-white/10 rounded w-20"></div>
        </div>
      ) : (
        <>
          {/* Sparkline background */}
          {renderSparkline()}

          {/* Content */}
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-400 uppercase tracking-wide">{title}</p>
              {icon && (
                <div className="text-lime-400 opacity-60 group-hover:opacity-100 transition-opacity">
                  {icon}
                </div>
              )}
            </div>

            {/* Value */}
            <p className="text-3xl font-bold text-white mb-2 tracking-tight">{value}</p>

            {/* Change indicator */}
            {change !== undefined && (
              <div className={`flex items-center gap-1.5 text-sm font-medium ${getChangeColor(change)}`}>
                {getChangeIcon(change)}
                <span>{formatChange(change)}</span>
                {changeLabel && <span className="text-gray-500 ml-1">{changeLabel}</span>}
              </div>
            )}
          </div>

          {/* Hover glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-lime-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        </>
      )}
    </div>
  );
};

export default SocialStatCard;
