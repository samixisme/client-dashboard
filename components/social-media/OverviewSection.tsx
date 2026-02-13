import React from 'react';
import SocialStatCard from './SocialStatCard';
import { PlatformOverview } from '../../types';
import { Users, TrendingUp, Heart, MessageCircle, Share2, Eye, UserPlus, BarChart3 } from 'lucide-react';

interface OverviewSectionProps {
  overview: PlatformOverview | null;
  loading?: boolean;
}

const OverviewSection: React.FC<OverviewSectionProps> = ({ overview, loading = false }) => {
  // Generate sparkline data for demo (in real app, this would come from Firebase)
  const generateSparkline = (baseValue: number, variance: number = 0.1) => {
    return Array.from({ length: 7 }, () =>
      baseValue * (1 + (Math.random() - 0.5) * variance)
    );
  };

  const stats = overview ? [
    {
      title: 'Total Followers',
      value: overview.totalFollowers.toLocaleString(),
      change: overview.followerGrowthRate,
      changeLabel: 'vs last period',
      icon: <Users className="h-5 w-5" />,
      sparklineData: generateSparkline(overview.totalFollowers, 0.05),
    },
    {
      title: 'Engagement Rate',
      value: `${overview.avgEngagementRate.toFixed(2)}%`,
      change: overview.engagementGrowthRate,
      changeLabel: 'vs last period',
      icon: <TrendingUp className="h-5 w-5" />,
      sparklineData: generateSparkline(overview.avgEngagementRate, 0.15),
    },
    {
      title: 'Total Likes',
      value: overview.totalLikes.toLocaleString(),
      change: 12.5,
      changeLabel: 'this week',
      icon: <Heart className="h-5 w-5" />,
      sparklineData: generateSparkline(overview.totalLikes, 0.2),
    },
    {
      title: 'Total Comments',
      value: overview.totalComments.toLocaleString(),
      change: 8.3,
      changeLabel: 'this week',
      icon: <MessageCircle className="h-5 w-5" />,
      sparklineData: generateSparkline(overview.totalComments, 0.18),
    },
    {
      title: 'Total Shares',
      value: overview.totalShares.toLocaleString(),
      change: 15.7,
      changeLabel: 'this week',
      icon: <Share2 className="h-5 w-5" />,
      sparklineData: generateSparkline(overview.totalShares, 0.25),
    },
    {
      title: 'Total Reach',
      value: overview.totalReach.toLocaleString(),
      change: overview.reachGrowthRate,
      changeLabel: 'vs last period',
      icon: <Eye className="h-5 w-5" />,
      sparklineData: generateSparkline(overview.totalReach, 0.12),
    },
    {
      title: 'New Followers',
      value: overview.newFollowers.toLocaleString(),
      change: 18.2,
      changeLabel: 'this week',
      icon: <UserPlus className="h-5 w-5" />,
      sparklineData: generateSparkline(overview.newFollowers, 0.3),
    },
    {
      title: 'Total Posts',
      value: overview.totalPosts.toLocaleString(),
      change: 5.1,
      changeLabel: 'this week',
      icon: <BarChart3 className="h-5 w-5" />,
      sparklineData: generateSparkline(overview.totalPosts, 0.08),
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Overview</h2>
          <p className="text-sm text-gray-400">Your social media performance at a glance</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading || !overview ? (
          // Loading skeletons
          Array.from({ length: 8 }).map((_, idx) => (
            <SocialStatCard
              key={idx}
              title=""
              value=""
              loading={true}
            />
          ))
        ) : (
          // Actual stats
          stats.map((stat, idx) => (
            <div
              key={stat.title}
              style={{
                animation: `fadeInUp 0.6s ease-out ${idx * 0.1}s both`,
              }}
            >
              <SocialStatCard {...stat} />
            </div>
          ))
        )}
      </div>

      {/* Summary insight */}
      {overview && !loading && (
        <div
          className="rounded-xl bg-gradient-to-br from-lime-500/10 to-transparent border border-lime-500/20 p-6 backdrop-blur-xl"
          style={{ animation: 'fadeInUp 0.6s ease-out 0.8s both' }}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-lime-500/20 backdrop-blur-sm">
              <TrendingUp className="h-6 w-6 text-lime-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Performance Summary</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                Your overall engagement is up <span className="font-bold text-lime-400">{overview.engagementGrowthRate.toFixed(1)}%</span> compared to last period.
                You've gained <span className="font-bold text-lime-400">{overview.newFollowers.toLocaleString()}</span> new followers
                and reached <span className="font-bold text-lime-400">{overview.totalReach.toLocaleString()}</span> people
                across all platforms.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OverviewSection;
