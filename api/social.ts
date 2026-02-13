import { Router, Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';

const socialRouter = Router();

// ─── Platform OAuth2 Configuration ─────────────────────────────────────────────
// Client IDs/secrets loaded from environment variables.

interface PlatformOAuthConfig {
    clientId: string;
    clientSecret: string;
    authUrl: string;
    tokenUrl: string;
    apiBase: string;
    scopes: string[];
    redirectUri: string;
}

function getPlatformConfig(platform: string): PlatformOAuthConfig | null {
    const prefix = platform.toUpperCase();
    const clientId = process.env[`${prefix}_CLIENT_ID`];
    const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];

    if (!clientId || !clientSecret) return null;

    const redirectUri = process.env.SOCIAL_OAUTH_REDIRECT_URI || 'http://localhost:3000/#/social-media/callback';

    const configs: Record<string, Omit<PlatformOAuthConfig, 'clientId' | 'clientSecret' | 'redirectUri'>> = {
        instagram: {
            // Instagram API with Instagram Login (uses Facebook OAuth)
            authUrl: 'https://www.facebook.com/v22.0/dialog/oauth',
            tokenUrl: 'https://graph.facebook.com/v22.0/oauth/access_token',
            apiBase: 'https://graph.instagram.com',
            scopes: [
                // Instagram API with Instagram Login scopes (Professional accounts only)
                'instagram_business_basic',
                'instagram_business_content_publish',
                'instagram_business_manage_messages',
                'instagram_business_manage_comments',
                'pages_show_list',              // Required for professional accounts
                'pages_read_engagement'         // Required for insights
            ],
        },
        twitter: {
            authUrl: 'https://twitter.com/i/oauth2/authorize',
            tokenUrl: 'https://api.twitter.com/2/oauth2/token',
            apiBase: 'https://api.twitter.com/2',
            scopes: ['tweet.read', 'users.read', 'offline.access'],
        },
        facebook: {
            authUrl: 'https://www.facebook.com/v22.0/dialog/oauth',
            tokenUrl: 'https://graph.facebook.com/v22.0/oauth/access_token',
            apiBase: 'https://graph.facebook.com/v22.0',
            scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'read_insights'],
        },
        linkedin: {
            authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
            tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
            apiBase: 'https://api.linkedin.com/v2',
            scopes: ['r_organization_social', 'r_organization_admin'],
        },
        tiktok: {
            authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
            tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
            apiBase: 'https://open.tiktokapis.com/v2',
            scopes: ['user.info.basic', 'user.info.stats', 'video.list'],
        },
        youtube: {
            authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',
            apiBase: 'https://www.googleapis.com/youtube/v3',
            scopes: ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/yt-analytics.readonly'],
        },
    };

    const cfg = configs[platform];
    if (!cfg) return null;

    return { ...cfg, clientId, clientSecret, redirectUri };
}

// Store PKCE verifiers in memory (for Twitter OAuth2 PKCE flow)
const pkceStore = new Map<string, string>();

// ─── GET /api/social/platforms ──────────────────────────────────────────────────
// Returns which platforms have API credentials configured.

socialRouter.get('/platforms', (_req: Request, res: Response) => {
    const platforms = ['instagram', 'twitter', 'facebook', 'linkedin', 'tiktok', 'youtube'];
    const configured = platforms.map((p) => ({
        platform: p,
        configured: !!(process.env[`${p.toUpperCase()}_CLIENT_ID`] && process.env[`${p.toUpperCase()}_CLIENT_SECRET`]),
    }));
    res.json({ platforms: configured });
});

// ─── GET /api/social/auth/:platform ─────────────────────────────────────────────
// Generates the OAuth2 authorization URL for a platform.

socialRouter.get('/auth/:platform', (req: Request, res: Response) => {
    const platform = req.params.platform as string;
    const config = getPlatformConfig(platform);

    if (!config) {
        return res.status(400).json({
            error: `Platform "${platform}" is not configured. Set ${platform.toUpperCase()}_CLIENT_ID and ${platform.toUpperCase()}_CLIENT_SECRET in .env`,
        });
    }

    const state = crypto.randomBytes(16).toString('hex');

    const params: Record<string, string> = {
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: config.scopes.join(' '),
        response_type: 'code',
        state: `${platform}:${state}`,
    };

    // Twitter requires PKCE
    if (platform === 'twitter') {
        const verifier = crypto.randomBytes(32).toString('base64url');
        const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
        pkceStore.set(state, verifier);
        params.code_challenge = challenge;
        params.code_challenge_method = 'S256';
    }

    // TikTok uses client_key instead of client_id
    if (platform === 'tiktok') {
        params.client_key = config.clientId;
        delete params.client_id;
    }

    const authUrl = `${config.authUrl}?${new URLSearchParams(params).toString()}`;
    res.json({ authUrl, state });
});

// ─── POST /api/social/auth/callback ─────────────────────────────────────────────
// Exchanges the authorization code for access + refresh tokens.

socialRouter.post('/auth/callback', async (req: Request, res: Response) => {
    const { code, state } = req.body;

    if (!code || !state) {
        return res.status(400).json({ error: 'Missing code or state parameter' });
    }

    const [platform, stateId] = (state as string).split(':');
    const config = getPlatformConfig(platform);

    if (!config) {
        return res.status(400).json({ error: `Unknown platform: ${platform}` });
    }

    try {
        const tokenParams: Record<string, string> = {
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code: code as string,
            redirect_uri: config.redirectUri,
            grant_type: 'authorization_code',
        };

        // Twitter PKCE
        if (platform === 'twitter' && stateId) {
            const verifier = pkceStore.get(stateId);
            if (verifier) {
                tokenParams.code_verifier = verifier;
                pkceStore.delete(stateId);
            }
        }

        // TikTok uses client_key
        if (platform === 'tiktok') {
            tokenParams.client_key = config.clientId;
            delete tokenParams.client_id;
        }

        let tokenResponse;

        if (platform === 'instagram') {
            // Instagram requires form-encoded POST
            tokenResponse = await axios.post(config.tokenUrl, new URLSearchParams(tokenParams), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
        } else if (platform === 'twitter') {
            // Twitter uses Basic auth header
            const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
            tokenResponse = await axios.post(config.tokenUrl, new URLSearchParams(tokenParams), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${basicAuth}`,
                },
            });
        } else {
            tokenResponse = await axios.post(config.tokenUrl, new URLSearchParams(tokenParams), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });
        }

        const tokens = tokenResponse.data;

        // For Instagram, exchange short-lived token for long-lived
        if (platform === 'instagram' && tokens.access_token) {
            try {
                const longLivedResp = await axios.get(`${config.apiBase}/access_token`, {
                    params: {
                        grant_type: 'ig_exchange_token',
                        client_secret: config.clientSecret,
                        access_token: tokens.access_token,
                    },
                });
                tokens.access_token = longLivedResp.data.access_token;
                tokens.expires_in = longLivedResp.data.expires_in;
            } catch {
                // Keep short-lived token if exchange fails
            }
        }

        // For Facebook, exchange short-lived token for long-lived (60 days)
        if (platform === 'facebook' && tokens.access_token) {
            try {
                const longLivedUrl = `${config.tokenUrl}?grant_type=fb_exchange_token&client_id=${config.clientId}&client_secret=${config.clientSecret}&fb_exchange_token=${tokens.access_token}`;
                const longLivedResp = await axios.get(longLivedUrl);

                if (longLivedResp.data.access_token) {
                    tokens.access_token = longLivedResp.data.access_token;
                    tokens.expires_in = longLivedResp.data.expires_in;
                    console.log('✅ Exchanged for Facebook long-lived token (60 days)');
                }
            } catch (error) {
                console.error('⚠️ Failed to exchange for Facebook long-lived token:', error);
                // Keep short-lived token if exchange fails
            }
        }

        res.json({
            platform,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresIn: tokens.expires_in,
            userId: tokens.user_id || tokens.open_id,
        });
    } catch (error: any) {
        const errMsg = error.response?.data?.error_description || error.response?.data?.error || error.message;
        res.status(500).json({ error: `Token exchange failed: ${errMsg}` });
    }
});

// ─── POST /api/social/fetch/:platform ───────────────────────────────────────────
// Proxies API requests to social platforms using stored access tokens.
// The frontend sends the access token (stored in Firestore) and the
// endpoint to call. The backend proxies the request to avoid CORS issues.

socialRouter.post('/fetch/:platform', async (req: Request, res: Response) => {
    const platform = req.params.platform as string;
    const { accessToken, endpoint, method = 'GET', body } = req.body;

    if (!accessToken || !endpoint) {
        return res.status(400).json({ error: 'Missing accessToken or endpoint' });
    }

    const config = getPlatformConfig(platform);
    const apiBase = config?.apiBase || getDefaultApiBase(platform);

    if (!apiBase) {
        return res.status(400).json({ error: `Unknown platform: ${platform}` });
    }

    try {
        const url = endpoint.startsWith('http') ? endpoint : `${apiBase}${endpoint}`;
        const headers: Record<string, string> = {};

        // Platform-specific auth headers
        if (platform === 'linkedin') {
            headers.Authorization = `Bearer ${accessToken}`;
            headers['LinkedIn-Version'] = '202502';
            headers['X-Restli-Protocol-Version'] = '2.0.0';
        } else if (platform === 'twitter') {
            headers.Authorization = `Bearer ${accessToken}`;
        } else if (platform === 'tiktok') {
            headers.Authorization = `Bearer ${accessToken}`;
        } else {
            // Instagram, Facebook, YouTube use query param
        }

        const axiosConfig: Record<string, any> = {
            method,
            url,
            headers,
        };

        // Add access_token as query param for Meta and Google platforms
        if (['instagram', 'facebook'].includes(platform)) {
            axiosConfig.params = { access_token: accessToken };
        } else if (platform === 'youtube') {
            axiosConfig.params = { key: process.env.YOUTUBE_API_KEY, access_token: accessToken };
        }

        if (body && method !== 'GET') {
            axiosConfig.data = body;
        }

        const response = await axios(axiosConfig);
        res.json(response.data);
    } catch (error: any) {
        const status = error.response?.status || 500;
        const errData = error.response?.data || { error: error.message };
        res.status(status).json(errData);
    }
});

// ─── POST /api/social/refresh/:platform ─────────────────────────────────────────
// Refreshes an expired access token using the refresh token.

socialRouter.post('/refresh/:platform', async (req: Request, res: Response) => {
    const platform = req.params.platform as string;
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: 'Missing refreshToken' });
    }

    const config = getPlatformConfig(platform);
    if (!config) {
        return res.status(400).json({ error: `Platform "${platform}" not configured` });
    }

    try {
        const params: Record<string, string> = {
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: config.clientId,
            client_secret: config.clientSecret,
        };

        // Instagram uses a different endpoint for refresh
        let tokenUrl = config.tokenUrl;
        if (platform === 'instagram') {
            tokenUrl = `${config.apiBase}/refresh_access_token`;
            delete params.client_secret;
            delete params.client_id;
            params.grant_type = 'ig_refresh_token';
            params.access_token = refreshToken;
        }

        if (platform === 'tiktok') {
            params.client_key = config.clientId;
            delete params.client_id;
        }

        const response = await axios.post(tokenUrl, new URLSearchParams(params), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        res.json({
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token || refreshToken,
            expiresIn: response.data.expires_in,
        });
    } catch (error: any) {
        const errMsg = error.response?.data?.error_description || error.message;
        res.status(500).json({ error: `Token refresh failed: ${errMsg}` });
    }
});

function getDefaultApiBase(platform: string): string | null {
    const bases: Record<string, string> = {
        instagram: 'https://graph.instagram.com',
        twitter: 'https://api.twitter.com/2',
        facebook: 'https://graph.facebook.com/v22.0',
        linkedin: 'https://api.linkedin.com/v2',
        tiktok: 'https://open.tiktokapis.com/v2',
        youtube: 'https://www.googleapis.com/youtube/v3',
    };
    return bases[platform] || null;
}

export default socialRouter;
