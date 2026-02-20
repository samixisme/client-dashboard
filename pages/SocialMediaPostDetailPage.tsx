import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    ArrowLeft,
    ExternalLink,
    Heart,
    MessageCircle,
    Share2,
    Eye,
    TrendingUp,
    MousePointer,
    Bookmark,
    Play,
    Instagram,
    Twitter,
    Facebook,
    Linkedin,
    Music,
    Youtube,
    ImageOff,
} from 'lucide-react';
import { useSocialMediaStore } from '../stores/socialMediaStore';
import { SocialPost, SocialPlatform } from '../types';

// ─── Platform config ──────────────────────────────────────────────────────────

interface PlatformConfig {
    color: string;
    label: string;
    Icon: React.ElementType;
}

const PLATFORM_CONFIG: Record<SocialPlatform, PlatformConfig> = {
    instagram: { color: '#E1306C', label: 'Instagram', Icon: Instagram },
    twitter:   { color: '#1DA1F2', label: 'Twitter',   Icon: Twitter   },
    facebook:  { color: '#1877F2', label: 'Facebook',  Icon: Facebook  },
    linkedin:  { color: '#0A66C2', label: 'LinkedIn',  Icon: Linkedin  },
    tiktok:    { color: '#000000', label: 'TikTok',    Icon: Music     },
    youtube:   { color: '#FF0000', label: 'YouTube',   Icon: Youtube   },
};

// ─── Metric card ─────────────────────────────────────────────────────────────

interface MetricCardProps {
    Icon: React.ElementType;
    label: string;
    value: number | undefined;
    formatter?: (n: number) => string;
    accent?: boolean;
}

const formatNumber = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
};

const MetricCard: React.FC<MetricCardProps> = ({
    Icon,
    label,
    value,
    formatter = formatNumber,
    accent = false,
}) => {
    if (value === undefined || value === null) return null;

    return (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-white/50 text-xs font-medium uppercase tracking-wider">
                <Icon size={14} />
                <span>{label}</span>
            </div>
            <span className={`text-2xl font-bold ${accent ? 'text-lime-400' : 'text-white'}`}>
                {formatter(value)}
            </span>
        </div>
    );
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────

const LoadingSkeleton: React.FC = () => (
    <div className="animate-pulse space-y-6">
        <div className="h-6 w-32 bg-white/10 rounded-lg" />
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-4">
            <div className="h-8 w-48 bg-white/10 rounded-lg" />
            <div className="h-4 w-full bg-white/10 rounded" />
            <div className="h-4 w-5/6 bg-white/10 rounded" />
            <div className="h-4 w-3/4 bg-white/10 rounded" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-20 bg-white/5 border border-white/10 rounded-xl" />
            ))}
        </div>
    </div>
);

// ─── Not found ────────────────────────────────────────────────────────────────

const PostNotFound: React.FC<{ postId: string }> = ({ postId }) => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 max-w-md w-full">
            <ImageOff size={48} className="text-white/20 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Post not found</h2>
            <p className="text-white/50 text-sm mb-6">
                No post with ID <span className="font-mono text-lime-400 break-all">{postId}</span> exists in the current data.
            </p>
            <Link
                to="/social-media"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-lime-400/10 border border-lime-400/20 text-lime-400 text-sm font-medium hover:bg-lime-400/20 transition-colors"
            >
                <ArrowLeft size={16} />
                Back to Social Media
            </Link>
        </div>
    </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const SocialMediaPostDetailPage: React.FC = () => {
    const { postId } = useParams<{ postId: string }>();
    const { posts, loading, initListeners } = useSocialMediaStore();

    useEffect(() => {
        if (posts.length === 0 && !loading) {
            const unsubscribes = initListeners();
            return () => unsubscribes.forEach((unsub) => unsub());
        }
    }, [posts.length, loading, initListeners]);

    if (loading) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <LoadingSkeleton />
            </div>
        );
    }

    const post: SocialPost | undefined = posts.find((p) => p.id === postId);

    if (!post) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <PostNotFound postId={postId ?? ''} />
            </div>
        );
    }

    const platform = PLATFORM_CONFIG[post.platform];
    const { Icon: PlatformIcon } = platform;

    const publishedDate = post.publishedAt
        ? new Date(post.publishedAt).toLocaleString(undefined, {
              year:   'numeric',
              month:  'long',
              day:    'numeric',
              hour:   '2-digit',
              minute: '2-digit',
          })
        : null;

    const engagementFormatted =
        post.metrics.engagementRate !== undefined
            ? `${post.metrics.engagementRate.toFixed(2)}%`
            : null;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Back link */}
            <Link
                to="/social-media"
                className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors"
            >
                <ArrowLeft size={16} />
                Back to Social Media
            </Link>

            {/* Header card */}
            <div className="bg-glass/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 space-y-5">
                {/* Platform badge + post type + account */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Platform badge */}
                    <span
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border"
                        style={{
                            color:            platform.color,
                            borderColor:      `${platform.color}40`,
                            backgroundColor:  `${platform.color}15`,
                        }}
                    >
                        <PlatformIcon size={13} />
                        {platform.label}
                    </span>

                    {/* Post type badge */}
                    {post.type && (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-white/70 capitalize">
                            {post.type}
                        </span>
                    )}

                    {/* Status badge */}
                    <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold capitalize ${
                            post.status === 'published'
                                ? 'bg-lime-400/10 border border-lime-400/20 text-lime-400'
                                : post.status === 'failed'
                                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                                : 'bg-white/5 border border-white/10 text-white/50'
                        }`}
                    >
                        {post.status}
                    </span>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* External link */}
                    {post.postUrl && (
                        <a
                            href={post.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-lime-400/10 border border-lime-400/20 text-lime-400 text-sm font-medium hover:bg-lime-400/20 transition-colors"
                        >
                            <ExternalLink size={14} />
                            View Post
                        </a>
                    )}
                </div>

                {/* Account handle */}
                {post.accountHandle && (
                    <p className="text-white/50 text-sm font-mono">@{post.accountHandle}</p>
                )}

                {/* Post content */}
                <p className="text-white leading-relaxed whitespace-pre-wrap">{post.content}</p>

                {/* Published date */}
                {publishedDate && (
                    <p className="text-white/40 text-xs">Published {publishedDate}</p>
                )}
            </div>

            {/* Media preview */}
            {post.mediaUrls && post.mediaUrls.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-white/70 text-sm font-semibold uppercase tracking-wider">
                        Media
                    </h2>
                    <div className={`grid gap-3 ${post.mediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'}`}>
                        {post.mediaUrls.map((url, idx) => (
                            <div
                                key={idx}
                                className="relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10 group"
                            >
                                <img
                                    src={url}
                                    alt={`Media ${idx + 1}`}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    loading="lazy"
                                    onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Metrics breakdown */}
            <section className="space-y-3">
                <h2 className="text-white/70 text-sm font-semibold uppercase tracking-wider">
                    Performance Metrics
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    <MetricCard Icon={Heart}         label="Likes"          value={post.metrics.likes}       />
                    <MetricCard Icon={MessageCircle} label="Comments"       value={post.metrics.comments}    />
                    <MetricCard Icon={Share2}         label="Shares"         value={post.metrics.shares}      />
                    <MetricCard Icon={Eye}            label="Reach"          value={post.metrics.reach}       />
                    <MetricCard Icon={Eye}            label="Impressions"    value={post.metrics.impressions} />
                    <MetricCard Icon={MousePointer}   label="Clicks"         value={post.metrics.clicks}      />
                    <MetricCard Icon={Bookmark}       label="Saves"          value={post.metrics.saves}       />
                    <MetricCard Icon={Play}           label="Video Views"    value={post.metrics.videoViews}  />
                </div>

                {/* Engagement rate — displayed as its own full-width highlight */}
                {post.metrics.engagementRate !== undefined && (
                    <div className="bg-lime-400/5 border border-lime-400/20 rounded-xl p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-white/70">
                            <TrendingUp size={18} className="text-lime-400" />
                            <span className="text-sm font-semibold">Engagement Rate</span>
                        </div>
                        <span className="text-2xl font-bold text-lime-400">{engagementFormatted}</span>
                    </div>
                )}
            </section>
        </div>
    );
};

export default SocialMediaPostDetailPage;
