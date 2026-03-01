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
    expect(res.body.state).toMatch(/^instagram:/);
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
    expect(res.body.error).toMatch(/invalid/i);
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

  it('exchanges code for token successfully (Facebook SDK flow)', async () => {
    mockDocSet.mockResolvedValueOnce(undefined);
    const res = await request(app)
      .post('/api/social/auth/callback')
      .send({
        code: 'fb-access-token-123',
        state: 'facebook:sdk-abc:client-1:user-1',
        expiresIn: 3600
      });
    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(true);
    expect(res.body.platform).toBe('facebook');
    // Ensure Firestore was called to save the token
    expect(mockDocSet).toHaveBeenCalled();
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
              });});

describe('Social Routes — GET /api/social/:platform/status', () => {
  it('returns 400 for invalid platform', async () => {
    const res = await request(app).get('/api/social/invalid-platform/status');
    expect(res.status).toBe(400);
  });

  it('returns connected: false if no token doc exists', async () => {
    mockDocGet.mockResolvedValueOnce({ exists: false });
    const res = await request(app).get('/api/social/twitter/status').query({ clientId: 'client-1' });
    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(false);
  });

  it('returns connection details if token doc exists', async () => {
    const now = Date.now();
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        accessToken: 'some-token',
        expiresAt: now + 3600000,
        connectedAt: now - 10000
      })
    });
    const res = await request(app).get('/api/social/twitter/status').query({ clientId: 'client-1' });
    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(true);
    expect(res.body.isExpired).toBe(false);
  });
});

describe('Social Routes — GET /api/social/:platform/metrics', () => {
  it('returns 400 for missing clientId', async () => {
    const res = await request(app).get('/api/social/twitter/metrics');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/clientId/i);
  });

  it('returns cached metrics if valid', async () => {
    mockDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        cachedUntil: Date.now() + 3600000,
        metrics: { posts: 10, likes: 20, reach: 30, impressions: 40 }
      })
    });
    
    const res = await request(app)
      .get('/api/social/twitter/metrics')
      .query({ clientId: 'client-1' });
      
    expect(res.status).toBe(200);
    expect(res.body.posts).toBe(10);
  });

      it('handles platform rate limits', async () => {
        // 1st mock is for cache (miss/expired)
        mockDocGet.mockResolvedValueOnce({ exists: false });
        // 2nd mock is for getValidToken (token exists and is valid)
        mockDocGet.mockResolvedValueOnce({
          exists: true,
          data: () => ({
            accessToken: 'valid-token',
            expiresAt: Date.now() + 3600000 
          })
        });
  
        const axios = require('axios').default;
        axios.get.mockRejectedValueOnce({
          response: { 
            status: 429, 
            headers: { 'retry-after': '120' } 
          }
        });
    const res = await request(app)
      .get('/api/social/twitter/metrics')
      .query({ clientId: 'client-1' });
      
    expect(res.status).toBe(429);
    expect(res.header['retry-after']).toBe('120');
  });
});

describe('Social Routes — DELETE /api/social/:platform/disconnect', () => {
  it('returns 404 if connection not found', async () => {
    mockDocGet.mockResolvedValueOnce({ exists: false });
    const res = await request(app).delete('/api/social/twitter/disconnect').query({ clientId: 'client-1' });
    expect(res.status).toBe(404);
  });

  it('deletes token and cache docs', async () => {
    const mockDelete = jest.fn().mockResolvedValue(undefined);
    mockDocRef.mockImplementation(() => ({
      get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ accessToken: 'tok' }) }),
      set: mockDocSet,
      delete: mockDelete
    }));

    const res = await request(app).delete('/api/social/twitter/disconnect').query({ clientId: 'client-1' });
    
    expect(res.status).toBe(200);
    expect(res.body.disconnected).toBe(true);
    expect(mockDelete).toHaveBeenCalledTimes(2); // once for token, once for cache
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
  
        const res = await request(app)      .post('/api/social/fetch/twitter')
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
