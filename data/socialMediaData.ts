import {
    SocialAccount,
    SocialPost,
    PlatformOverview,
    SocialAnomaly,
    ScheduledPost,
    EngagementInsight,
    SocialPlatform,
} from '../types';

// ─── Platform API Configuration ────────────────────────────────────────────────
// Each platform's OAuth2 endpoints and required scopes for the Express backend.
// Actual client IDs/secrets are stored in .env (never committed).

export const platformConfigs: Record<SocialPlatform, {
    name: string;
    color: string;
    authUrl: string;
    tokenUrl: string;
    apiBase: string;
    scopes: string[];
    envPrefix: string;
}> = {
    instagram: {
        name: 'Instagram',
        color: '#E1306C',
        authUrl: 'https://api.instagram.com/oauth/authorize',
        tokenUrl: 'https://api.instagram.com/oauth/access_token',
        apiBase: 'https://graph.instagram.com',
        scopes: [
            // Original scopes - keep for existing features
            'instagram_business_basic',
            'instagram_business_manage_insights',
            'instagram_business_content_publish',
            'instagram_manage_comments',
            'instagram_business_manage_messages',

            // Additional scopes required by Meta (from Permissions page)
            'instagram_basic',
            'instagram_content_publishing',
            'instagram_manage_messages',
            'pages_read_engagement',
            'pages_show_list',
            'business_management'
        ],
        envPrefix: 'INSTAGRAM',
    },
    twitter: {
        name: 'X (Twitter)',
        color: '#1DA1F2',
        authUrl: 'https://twitter.com/i/oauth2/authorize',
        tokenUrl: 'https://api.twitter.com/2/oauth2/token',
        apiBase: 'https://api.twitter.com/2',
        scopes: ['tweet.read', 'users.read', 'offline.access', 'tweet.write'],
        envPrefix: 'TWITTER',
    },
    facebook: {
        name: 'Facebook',
        color: '#1877F2',
        authUrl: 'https://www.facebook.com/v22.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v22.0/oauth/access_token',
        apiBase: 'https://graph.facebook.com/v22.0',
        scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'read_insights'],
        envPrefix: 'FACEBOOK',
    },
    linkedin: {
        name: 'LinkedIn',
        color: '#0A66C2',
        authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
        tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
        apiBase: 'https://api.linkedin.com/v2',
        scopes: ['r_organization_social', 'w_organization_social', 'r_organization_admin'],
        envPrefix: 'LINKEDIN',
    },
    tiktok: {
        name: 'TikTok',
        color: '#000000',
        authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
        tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
        apiBase: 'https://open.tiktokapis.com/v2',
        scopes: ['user.info.basic', 'user.info.stats', 'video.list'],
        envPrefix: 'TIKTOK',
    },
    youtube: {
        name: 'YouTube',
        color: '#FF0000',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        apiBase: 'https://www.googleapis.com/youtube/v3',
        scopes: ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/yt-analytics.readonly'],
        envPrefix: 'YOUTUBE',
    },
};

// ─── Firestore Collection Names ────────────────────────────────────────────────

export const SOCIAL_COLLECTIONS = {
    accounts: 'socialAccounts',
    posts: 'socialPosts',
    overviews: 'socialOverviews',
    anomalies: 'socialAnomalies',
    scheduledPosts: 'socialScheduledPosts',
    insights: 'socialInsights',
} as const;

// ─── Seed Data ─────────────────────────────────────────────────────────────────
// Used to populate Firestore on first setup. After initial seed, all data
// is managed via real API syncs and stored in Firestore.

export const seedAccounts: Omit<SocialAccount, 'id'>[] = [
    {
        platform: 'instagram',
        handle: '@jrag_studio',
        displayName: 'JRAG Studio',
        avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=JS&backgroundColor=E1306C',
        followers: 24800,
        following: 1230,
        posts: 486,
        isConnected: false,
        lastSynced: '',
    },
    {
        platform: 'twitter',
        handle: '@jrag_dev',
        displayName: 'JRAG Dev',
        avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=JD&backgroundColor=1DA1F2',
        followers: 18200,
        following: 890,
        posts: 1247,
        isConnected: false,
        lastSynced: '',
    },
    {
        platform: 'facebook',
        handle: 'JRAGStudio',
        displayName: 'JRAG Studio',
        avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=FB&backgroundColor=1877F2',
        followers: 31500,
        following: 420,
        posts: 312,
        isConnected: false,
        lastSynced: '',
    },
    {
        platform: 'linkedin',
        handle: 'jrag-studio',
        displayName: 'JRAG Studio',
        avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=LI&backgroundColor=0A66C2',
        followers: 12400,
        following: 560,
        posts: 198,
        isConnected: false,
        lastSynced: '',
    },
    {
        platform: 'tiktok',
        handle: '@jrag_studio',
        displayName: 'JRAG Studio',
        avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=TK&backgroundColor=000000',
        followers: 45600,
        following: 210,
        posts: 89,
        isConnected: false,
        lastSynced: '',
    },
    {
        platform: 'youtube',
        handle: '@JRAGStudio',
        displayName: 'JRAG Studio',
        avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=YT&backgroundColor=FF0000',
        followers: 8900,
        following: 65,
        posts: 52,
        isConnected: false,
        lastSynced: '',
    },
];

// ─── Metrics normalization helpers ─────────────────────────────────────────────
// Maps each platform's API response fields to our unified PostMetrics shape.

export function normalizePlatformMetrics(platform: SocialPlatform, raw: Record<string, number>) {
    switch (platform) {
        case 'instagram':
            return {
                likes: raw.like_count ?? 0,
                comments: raw.comments_count ?? 0,
                shares: raw.shares ?? 0,
                impressions: raw.views ?? raw.impressions ?? 0,
                reach: raw.reach ?? 0,
                engagementRate: raw.engagement ?? 0,
                saves: raw.saved ?? 0,
            };
        case 'twitter':
            return {
                likes: raw.like_count ?? 0,
                comments: raw.reply_count ?? 0,
                shares: (raw.retweet_count ?? 0) + (raw.quote_count ?? 0),
                impressions: raw.impression_count ?? 0,
                reach: raw.impression_count ?? 0,
                engagementRate: 0,
                clicks: raw.url_link_clicks ?? 0,
            };
        case 'facebook':
            return {
                likes: raw.reactions ?? raw.likes ?? 0,
                comments: raw.comments ?? 0,
                shares: raw.shares ?? 0,
                impressions: raw.post_impressions ?? 0,
                reach: raw.post_reach ?? 0,
                engagementRate: raw.post_engaged_users ?? 0,
            };
        case 'linkedin':
            return {
                likes: raw.likeCount ?? 0,
                comments: raw.commentCount ?? 0,
                shares: raw.shareCount ?? 0,
                impressions: raw.impressionCount ?? 0,
                reach: raw.uniqueImpressionsCount ?? 0,
                engagementRate: raw.engagement ?? 0,
                clicks: raw.clickCount ?? 0,
            };
        case 'tiktok':
            return {
                likes: raw.like_count ?? 0,
                comments: raw.comment_count ?? 0,
                shares: raw.share_count ?? 0,
                impressions: raw.view_count ?? 0,
                reach: raw.view_count ?? 0,
                engagementRate: 0,
                videoViews: raw.view_count ?? 0,
            };
        case 'youtube':
            return {
                likes: raw.likeCount ?? 0,
                comments: raw.commentCount ?? 0,
                shares: raw.shares ?? 0,
                impressions: raw.views ?? raw.viewCount ?? 0,
                reach: raw.views ?? raw.viewCount ?? 0,
                engagementRate: 0,
                videoViews: raw.viewCount ?? 0,
            };
        default:
            return {
                likes: 0, comments: 0, shares: 0,
                impressions: 0, reach: 0, engagementRate: 0,
            };
    }
}
