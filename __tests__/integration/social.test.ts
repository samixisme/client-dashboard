/**
 * @jest-environment node
 */
import request from 'supertest';
import { app } from '../../api/server';

// ─── Mock dependencies ─────────────────────────────────────────────────────

const mockDocGet = jest.fn();
const mockDocSet = jest.fn();
const mockDocRef = jest.fn(() => ({ get: mockDocGet, set: mockDocSet }));

jest.mock('../../api/firebaseAdmin', () => ({
  isAdminInitialized: jest.fn(() => true),
  getFirestore: jest.fn(() => ({
    doc: mockDocRef,
    collection: jest.fn(() => ({ doc: mockDocRef })),
  })),
}));

jest.mock('../../api/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnThis(),
  },
}));

// Mock axios for OAuth token exchange
jest.mock('axios', () => {
  const mockAxios = jest.fn() as any;
  mockAxios.get = jest.fn();
  mockAxios.post = jest.fn();
  mockAxios.delete = jest.fn();
  mockAxios.isAxiosError = jest.fn(() => false);
  return {
    __esModule: true,
    default: mockAxios,
  };
});

describe('Social Routes — GET /api/social/platforms', () => {
  it('returns list of platforms with configured status', async () => {
    const res = await request(app).get('/api/social/platforms');
    expect(res.status).toBe(200);
    expect(res.body.platforms).toBeInstanceOf(Array);
    expect(res.body.platforms.length).toBe(6);
    expect(res.body.platforms[0]).toHaveProperty('platform');
    expect(res.body.platforms[0]).toHaveProperty('configured');
  });
});

describe('Social Routes — GET /api/social/auth/:platform', () => {
  const originalClientId = process.env.INSTAGRAM_CLIENT_ID;
  const originalClientSecret = process.env.INSTAGRAM_CLIENT_SECRET;

  beforeEach(() => {
    process.env.INSTAGRAM_CLIENT_ID = 'test-client-id';
    process.env.INSTAGRAM_CLIENT_SECRET = 'test-client-secret';
  });

  afterAll(() => {
    if (originalClientId) process.env.INSTAGRAM_CLIENT_ID = originalClientId;
    else delete process.env.INSTAGRAM_CLIENT_ID;
    if (originalClientSecret) process.env.INSTAGRAM_CLIENT_SECRET = originalClientSecret;
    else delete process.env.INSTAGRAM_CLIENT_SECRET;
  });

  it('returns auth URL for configured platform', async () => {
    const res = await request(app)
      .get('/api/social/auth/instagram')
      .query({ clientId: 'client-1', userId: 'user-1' });
    expect(res.status).toBe(200);
    expect(res.body.authUrl).toMatch(/facebook\.com.*dialog\/oauth/);
    expect(res.body.state).toMatch(/^[0-9a-f]+$/);
  });

  it('returns 400 for unconfigured platform', async () => {
    const originalId = process.env.TWITTER_CLIENT_ID;
    const originalSecret = process.env.TWITTER_CLIENT_SECRET;
    delete process.env.TWITTER_CLIENT_ID;
    delete process.env.TWITTER_CLIENT_SECRET;
    const res = await request(app).get('/api/social/auth/twitter');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not configured/i);
    process.env.TWITTER_CLIENT_ID = originalId || 'test';
    process.env.TWITTER_CLIENT_SECRET = originalSecret || 'test';
  });
});

describe('Social Routes — POST /api/social/auth/callback', () => {
  it('returns 400 for missing code', async () => {
    const res = await request(app)
      .post('/api/social/auth/callback')
      .send({ state: 'instagram:abc:client-1:user-1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
  });

  it('returns 400 for missing state', async () => {
    const res = await request(app)
      .post('/api/social/auth/callback')
      .send({ code: 'auth-code-123' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty body', async () => {
    const res = await request(app)
      .post('/api/social/auth/callback')
      .send({});
    expect(res.status).toBe(400);
  });

  it('exchanges code for token successfully (Facebook flow)', async () => {
    process.env.FACEBOOK_CLIENT_ID = 'test-fb-id';
    process.env.FACEBOOK_CLIENT_SECRET = 'test-fb-secret';
    const mockAxios = require('axios').default;
    // First call: token exchange
    mockAxios.post.mockResolvedValueOnce({ data: { access_token: 'new-fb-token' } });
    // Second call: long-lived token exchange (facebook does fb_exchange_token)
    mockAxios.get.mockResolvedValueOnce({ data: { access_token: 'long-lived-fb-token', expires_in: 5184000 } });

    const res = await request(app)
      .post('/api/social/auth/callback')
      .send({
        code: 'fb-access-token-123',
        state: 'facebook:sdk-abc',
      });
    expect(res.status).toBe(200);
    // Response shape from social.ts line 239: { platform, accessToken, refreshToken, expiresIn, userId }
    expect(res.body.platform).toBe('facebook');
    expect(res.body.accessToken).toBeDefined();

    delete process.env.FACEBOOK_CLIENT_ID;
    delete process.env.FACEBOOK_CLIENT_SECRET;
  });

  it('handles token exchange failure gracefully', async () => {
    const mockAxios = require('axios').default;
    mockAxios.post.mockRejectedValueOnce({
      response: { data: { error: 'invalid_grant', error_description: 'Code expired' } }
    });
    const res = await request(app)
      .post('/api/social/auth/callback')
      .send({
        code: 'bad-code',
        state: 'twitter:state-123:client-1:user-1'
      });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Token exchange failed: Code expired/);
  });
});

describe('Social Routes — POST /api/social/fetch/:platform', () => {
  it('returns 400 for missing endpoint', async () => {
    const res = await request(app).post('/api/social/fetch/twitter').send({ accessToken: 'abc' });
    expect(res.status).toBe(400);
  });

  it('proxies request with provided token successfully', async () => {
    const axios = require('axios').default;
    axios.mockResolvedValueOnce({ data: { success: true } });

    const res = await request(app).post('/api/social/fetch/twitter')
      .send({ accessToken: 'abc', endpoint: '/test' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(axios).toHaveBeenCalled();
  });
});

describe('Social Routes — POST /api/social/refresh/:platform', () => {
  it('returns 400 for unconfigured platform', async () => {
    delete process.env.TWITTER_CLIENT_ID;
    const res = await request(app).post('/api/social/refresh/twitter').send({ refreshToken: 'abc' });
    expect(res.status).toBe(400);
  });
});
