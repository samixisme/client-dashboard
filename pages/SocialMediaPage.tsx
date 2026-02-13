import React, { useEffect, useState } from 'react';
import { useSocialMediaStore } from '../stores/socialMediaStore';
import OverviewSection from '../components/social-media/OverviewSection';
import EngagementChart from '../components/social-media/EngagementChart';
import PostAnalyticsSection from '../components/social-media/PostAnalyticsSection';
import PostScheduler from '../components/social-media/PostScheduler';
import AnomalyAlertsBanner from '../components/social-media/AnomalyAlertsBanner';
import AccountsList from '../components/social-media/AccountsList';
import ScheduledPostCard from '../components/social-media/ScheduledPostCard';
import PlatformFilterBar from '../components/social-media/PlatformFilterBar';
import { exportAllData, ExportFormat } from '../utils/exportData';
import { connectPlatform, disconnectPlatform, refreshPlatformData, handleOAuthCallback } from '../utils/socialAuth';
import { SocialPlatform, ScheduledPost } from '../types';
import { Plus, Download } from 'lucide-react';

const SocialMediaPage: React.FC = () => {
    const {
        activeTab,
        setActiveTab,
        initListeners,
        accounts,
        posts,
        overviews,
        anomalies,
        scheduledPosts,
        loading,
        markAnomalyRead,
        addScheduledPost
    } = useSocialMediaStore();

    const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(['instagram', 'twitter', 'facebook', 'linkedin', 'tiktok', 'youtube']);
    const [showScheduler, setShowScheduler] = useState(false);

    useEffect(() => {
        const unsubscribes = initListeners();
        return () => unsubscribes.forEach(unsub => unsub());
    }, [initListeners]);

    // Handle OAuth callback when user returns from social media platform
    useEffect(() => {
        const handleOAuth = async () => {
            const result = await handleOAuthCallback();

            if (result.success) {
                // Show success notification
                const platformName = result.platform?.charAt(0).toUpperCase() + result.platform?.slice(1);
                const message = result.username
                    ? `Successfully connected ${platformName} account (@${result.username})!`
                    : `Successfully connected ${platformName} account!`;

                // Create a success notification element
                const notification = document.createElement('div');
                notification.className = 'fixed top-4 right-4 bg-lime-500/20 border border-lime-500/30 text-lime-400 px-6 py-4 rounded-xl shadow-lg backdrop-blur-xl z-50 animate-fade-in';
                notification.innerHTML = `
                    <div class="flex items-center gap-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span class="font-semibold">${message}</span>
                    </div>
                `;
                document.body.appendChild(notification);

                // Remove notification after 5 seconds
                setTimeout(() => {
                    notification.style.opacity = '0';
                    setTimeout(() => notification.remove(), 300);
                }, 5000);

            } else if (result.error) {
                // Show error notification
                const errorMessage = result.message || 'Failed to connect account. Please try again.';

                const notification = document.createElement('div');
                notification.className = 'fixed top-4 right-4 bg-red-500/20 border border-red-500/30 text-red-400 px-6 py-4 rounded-xl shadow-lg backdrop-blur-xl z-50 animate-fade-in';
                notification.innerHTML = `
                    <div class="flex items-center gap-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                        <div>
                            <div class="font-semibold">Connection Failed</div>
                            <div class="text-sm text-red-300">${errorMessage}</div>
                        </div>
                    </div>
                `;
                document.body.appendChild(notification);

                // Remove notification after 7 seconds
                setTimeout(() => {
                    notification.style.opacity = '0';
                    setTimeout(() => notification.remove(), 300);
                }, 7000);
            }
        };

        handleOAuth();
    }, []);

    const handleTogglePlatform = (platform: SocialPlatform) => {
        setSelectedPlatforms(prev =>
            prev.includes(platform)
                ? prev.filter(p => p !== platform)
                : [...prev, platform]
        );
    };

    const handleExportData = (format: ExportFormat) => {
        const currentOverview = overviews.find(o =>
            selectedPlatforms.length === 0 || selectedPlatforms.includes(o.platform)
        );

        exportAllData(
            {
                accounts: accounts.filter(a => selectedPlatforms.includes(a.platform)),
                posts: filteredPosts,
                overview: currentOverview ? [currentOverview] : [],
                scheduledPosts: scheduledPosts.filter(sp => selectedPlatforms.includes(sp.platform)),
                anomalies: anomalies.filter(an => selectedPlatforms.includes(an.platform)),
            },
            format
        );
    };

    // Filter data by selected platforms
    const filteredPosts = posts.filter(p => selectedPlatforms.includes(p.platform));
    const filteredAccounts = accounts.filter(a => selectedPlatforms.includes(a.platform));
    const filteredAnomalies = anomalies.filter(a => selectedPlatforms.includes(a.platform));
    const filteredScheduledPosts = scheduledPosts.filter(sp => selectedPlatforms.includes(sp.platform));

    // Get aggregated overview for selected platforms
    const aggregatedOverview = overviews
        .filter(o => selectedPlatforms.includes(o.platform))
        .reduce((acc, curr) => {
            if (!acc) return curr;
            return {
                ...acc,
                totalFollowers: acc.totalFollowers + curr.totalFollowers,
                totalLikes: acc.totalLikes + curr.totalLikes,
                totalComments: acc.totalComments + curr.totalComments,
                totalShares: acc.totalShares + curr.totalShares,
                totalReach: acc.totalReach + curr.totalReach,
                totalPosts: acc.totalPosts + curr.totalPosts,
                newFollowers: acc.newFollowers + curr.newFollowers,
                avgEngagementRate: (acc.avgEngagementRate + curr.avgEngagementRate) / 2,
            };
        }, overviews[0] || null);

    // Generate engagement chart data from posts
    const engagementChartData = filteredPosts
        .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
        .slice(-30) // Last 30 posts
        .map(post => ({
            date: new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            likes: post.metrics.likes,
            comments: post.metrics.comments,
            shares: post.metrics.shares,
            reach: post.metrics.reach,
            engagement: Math.round(post.metrics.engagementRate * 100),
        }));

    return (
        <div>
            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateX(30px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 8px var(--primary); }
                    50% { box-shadow: 0 0 20px var(--primary); }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
                .animate-fade-in-up {
                    animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    opacity: 0;
                }
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
                .animate-slide-in-right { animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-pulse-glow { animation: pulse-glow 2.5s ease-in-out infinite; }
                .animate-shimmer { animation: shimmer 2s infinite; }
            `}</style>

            {/* Header */}
            <div className="flex justify-between items-center mb-8 flex-wrap gap-4 animate-fade-in">
                <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
                    <h1 className="text-4xl font-bold text-text-primary bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text">Social Media</h1>
                    <p className="mt-2 text-text-secondary/90 font-medium">Monitor engagement, track analytics, and manage your social presence.</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap animate-slide-in-right">
                    <div className="relative group">
                        <button className="px-6 py-2.5 bg-lime-500/20 text-lime-400 border border-lime-500/30 text-sm font-bold rounded-xl hover:bg-lime-500/30 hover:shadow-lg hover:shadow-lime-500/20 transition-all duration-300 flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            Export Data
                        </button>
                        <div className="absolute top-full right-0 mt-2 w-40 bg-glass/90 backdrop-blur-xl border border-white/20 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-10">
                            <button
                                onClick={() => handleExportData('json')}
                                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-lime-500/20 transition-colors rounded-t-lg"
                            >
                                Export as JSON
                            </button>
                            <button
                                onClick={() => handleExportData('csv')}
                                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-lime-500/20 transition-colors rounded-b-lg"
                            >
                                Export as CSV
                            </button>
                        </div>
                    </div>
                    {activeTab === 'schedule' && (
                        <button
                            onClick={() => setShowScheduler(!showScheduler)}
                            className="px-6 py-2.5 bg-lime-500 text-black text-sm font-bold rounded-xl hover:bg-lime-400 hover:shadow-lg hover:shadow-lime-500/50 transition-all duration-300 flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Schedule Post
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center bg-glass/60 backdrop-blur-xl rounded-xl p-1.5 border border-border-color shadow-md mb-8 animate-fade-in">
                {(['overview', 'analytics', 'schedule', 'anomalies', 'accounts'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2.5 rounded-lg transition-all duration-300 capitalize ${
                            activeTab === tab
                                ? 'bg-primary text-background shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] scale-110 font-bold'
                                : 'text-text-secondary hover:text-text-primary hover:bg-glass-light hover:scale-105'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Platform Filter */}
            <div className="mb-8 animate-fade-in">
                <PlatformFilterBar
                    selectedPlatforms={selectedPlatforms}
                    onTogglePlatform={handleTogglePlatform}
                    showAll={true}
                />
            </div>

            {/* Tab Content */}
            <div className="animate-fade-in">
                {activeTab === 'overview' && (
                    <div className="space-y-8">
                        <OverviewSection overview={aggregatedOverview} loading={loading} />
                        <EngagementChart data={engagementChartData} loading={loading} />
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <PostAnalyticsSection posts={filteredPosts} loading={loading} />
                )}

                {activeTab === 'schedule' && (
                    <div className="space-y-6">
                        {showScheduler && (
                            <PostScheduler
                                onSchedule={(post: Omit<ScheduledPost, 'id' | 'createdAt'>) => {
                                    addScheduledPost(post);
                                    setShowScheduler(false);
                                }}
                                onClose={() => setShowScheduler(false)}
                            />
                        )}

                        {filteredScheduledPosts.length > 0 ? (
                            <div>
                                <h3 className="text-xl font-bold text-white mb-4">Scheduled Posts</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredScheduledPosts.map((post, idx) => (
                                        <div
                                            key={post.id}
                                            style={{
                                                animation: `fadeInUp 0.6s ease-out ${idx * 0.1}s both`,
                                            }}
                                        >
                                            <ScheduledPostCard
                                                post={post}
                                                onEdit={(id) => console.log('Edit post:', id)}
                                                onDelete={(id) => console.log('Delete post:', id)}
                                                onPublishNow={(id) => console.log('Publish now:', id)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : !showScheduler ? (
                            <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl bg-glass/20 backdrop-blur-xl border border-white/10">
                                <div className="w-20 h-20 rounded-full bg-glass/40 backdrop-blur-xl border border-white/10 flex items-center justify-center mb-6">
                                    <Plus className="h-10 w-10 text-gray-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">No Scheduled Posts</h3>
                                <p className="text-gray-400 max-w-md mb-6">
                                    Start scheduling posts to maintain consistent engagement across all your social media platforms.
                                </p>
                                <button
                                    onClick={() => setShowScheduler(true)}
                                    className="px-6 py-3 rounded-lg bg-lime-500/20 text-lime-400 border border-lime-500/30 hover:bg-lime-500/30 transition-all duration-300 font-semibold flex items-center gap-2"
                                >
                                    <Plus className="h-5 w-5" />
                                    Schedule Your First Post
                                </button>
                            </div>
                        ) : null}
                    </div>
                )}

                {activeTab === 'anomalies' && (
                    <AnomalyAlertsBanner
                        anomalies={filteredAnomalies}
                        onMarkRead={markAnomalyRead}
                        onDismiss={(id) => console.log('Dismiss anomaly:', id)}
                    />
                )}

                {activeTab === 'accounts' && (
                    <AccountsList
                        accounts={filteredAccounts}
                        onConnect={connectPlatform}
                        onDisconnect={disconnectPlatform}
                        onRefresh={(id) => {
                            const account = accounts.find(a => a.id === id);
                            if (account) {
                                refreshPlatformData(id, account.platform);
                            }
                        }}
                        loading={loading}
                    />
                )}
            </div>
        </div>
    );
};

export default SocialMediaPage;
