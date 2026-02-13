import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar } from 'lucide-react';

interface EngagementData {
  date: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  engagement: number;
}

interface EngagementChartProps {
  data: EngagementData[];
  loading?: boolean;
}

const EngagementChart: React.FC<EngagementChartProps> = ({ data, loading = false }) => {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Custom tooltip with glass morphism
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-glass/90 backdrop-blur-xl border border-white/20 rounded-lg p-4 shadow-xl">
        <p className="text-sm font-semibold text-white mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-gray-300 capitalize">{entry.name}:</span>
              </div>
              <span className="text-xs font-semibold text-white">
                {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-glass/40 backdrop-blur-xl border border-white/10 p-6">
        <div className="h-80 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading chart data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-glass/40 backdrop-blur-xl border border-white/10 p-6 hover:bg-glass/50 transition-all duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Engagement Trends</h3>
          <p className="text-sm text-gray-400">Track your performance over time</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time range selector */}
          <div className="flex items-center gap-2 bg-glass/40 backdrop-blur-sm rounded-lg p-1">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`
                  px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300
                  ${timeRange === range
                    ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30'
                    : 'text-gray-400 hover:text-white'
                  }
                `}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>

          {/* Chart type selector */}
          <div className="flex items-center gap-2 bg-glass/40 backdrop-blur-sm rounded-lg p-1">
            <button
              onClick={() => setChartType('line')}
              className={`
                px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300
                ${chartType === 'line'
                  ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30'
                  : 'text-gray-400 hover:text-white'
                }
              `}
            >
              Line
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`
                px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300
                ${chartType === 'bar'
                  ? 'bg-lime-500/20 text-lime-400 border border-lime-500/30'
                  : 'text-gray-400 hover:text-white'
                }
              `}
            >
              Bar
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        {data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <Calendar className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">No engagement data available</p>
            <p className="text-xs text-gray-500 mt-1">Connect your accounts to see insights</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: '#9CA3AF' }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: '#9CA3AF' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', color: '#9CA3AF' }}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  dataKey="likes"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={{ fill: '#EF4444', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="comments"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="shares"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: '#10B981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="engagement"
                  stroke="#A3E635"
                  strokeWidth={2}
                  dot={{ fill: '#A3E635', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            ) : (
              <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: '#9CA3AF' }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: '#9CA3AF' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', color: '#9CA3AF' }}
                  iconType="circle"
                />
                <Bar dataKey="likes" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="comments" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="shares" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="engagement" fill="#A3E635" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default EngagementChart;
