/**
 * @jest-environment node
 */
import request from 'supertest';
import { app } from '../../api/server';

// ─── Mock external dependencies before they're imported ─────────────────────

// Mock Firebase Admin SDK
jest.mock('../../api/firebaseAdmin', () => ({
  isAdminInitialized: jest.fn(() => false),
  getFirestore: jest.fn(() => {
    throw new Error('Firebase Admin not initialized in test');
  }),
}));

// Mock pino logger to suppress output during tests
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

describe('Health & Readiness Endpoints', () => {
  it('GET /health returns 200 with uptime and service name', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      message: 'OK',
      service: 'client-dashboard-api',
    });
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /ready returns 200 with ready status', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.ready).toBe(true);
    expect(res.body.checks.server).toBe('ok');
  });

  it('GET /alive returns 200', async () => {
    const res = await request(app).get('/alive');
    expect(res.status).toBe(200);
    expect(res.body.alive).toBe(true);
  });
});

describe('Proxy Route — GET /api/proxy', () => {
  it('returns 400 when url param is missing', async () => {
    const res = await request(app).get('/api/proxy');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/URL parameter is required/i);
  });

  it('returns 400 for private IP (SSRF protection)', async () => {
    const res = await request(app)
      .get('/api/proxy')
      .query({ url: 'http://127.0.0.1/admin' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/private IP|not allowed/i);
  });

  it('returns 400 for localhost (SSRF protection)', async () => {
    const res = await request(app)
      .get('/api/proxy')
      .query({ url: 'http://localhost/secret' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for metadata endpoint (SSRF protection)', async () => {
    const res = await request(app)
      .get('/api/proxy')
      .query({ url: 'http://169.254.169.254/latest/meta-data/' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not allowed/i);
  });

  it('returns 400 for invalid projectId format', async () => {
    const res = await request(app)
      .get('/api/proxy')
      .query({ url: 'https://example.com', projectId: 'DROP TABLE;' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid.*projectId/i);
  });

  it('returns 400 for invalid feedbackId format', async () => {
    const res = await request(app)
      .get('/api/proxy')
      .query({ url: 'https://example.com', feedbackId: '<script>' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid.*feedbackId/i);
  });

  it('returns 400 for ftp protocol', async () => {
    const res = await request(app)
      .get('/api/proxy')
      .query({ url: 'ftp://example.com/file' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for URL with credentials', async () => {
    const res = await request(app)
      .get('/api/proxy')
      .query({ url: 'https://user:pass@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/credentials/i);
  });

  it('returns 200 and modifies HTML correctly for a valid URL', async () => {
    const nock = require('nock');
    nock('https://example.com')
      .get('/')
      .reply(200, `
        <html>
          <head>
            <link href="/style.css" rel="stylesheet">
            <script src="/app.js"></script>
            <meta http-equiv="Content-Security-Policy" content="default-src 'self'">
          </head>
          <body>
            <a href="/about">About</a>
            <img src="/logo.png">
            <form action="/submit"></form>
          </body>
        </html>
      `, {
        'Content-Type': 'text/html'
      });

    const res = await request(app)
      .get('/api/proxy')
      .query({ url: 'https://example.com/', projectId: 'proj-123', feedbackId: 'fb-456' });
    
    expect(res.status).toBe(200);
    const html = res.text;
    
    // Check rewritten URLs
    expect(html).toContain('href="https://example.com/style.css"');
    expect(html).toContain('src="https://example.com/app.js"');
    expect(html).toContain('href="https://example.com/about"');
    expect(html).toContain('src="https://example.com/logo.png"');
    expect(html).toContain('action="https://example.com/submit"');
    
    // Check CSP removal
    expect(html).not.toContain('Content-Security-Policy');
    
    // Check injected attributes
    expect(html).toContain('data-project-id="proj-123"');
    expect(html).toContain('data-feedback-id="fb-456"');
    
    // Check injected scripts/styles
    expect(html).toContain('cdn.tailwindcss.com');
    expect(html).toContain('client-dashboard-feedback-tool');
  });

  it('returns 500 when proxy request fails', async () => {
    const nock = require('nock');
    nock('https://failing-example.com')
      .get('/')
      .replyWithError('Network error');

    const res = await request(app)
      .get('/api/proxy')
      .query({ url: 'https://failing-example.com' });
      
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Error fetching or modifying the URL/);
  });
});

describe('AI Helper Endpoints', () => {
  it('POST /api/ai/extract-colors returns 400 without text', async () => {
    const res = await request(app)
      .post('/api/ai/extract-colors')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/text.*required/i);
  });

  it('POST /api/ai/extract-colors extracts hex codes from text', async () => {
    const res = await request(app)
      .post('/api/ai/extract-colors')
      .send({ text: 'Primary color is #A3E635 and secondary is #84CC16' });
    expect(res.status).toBe(200);
    expect(res.body.colors.length).toBeGreaterThanOrEqual(2);
    // Regex matches both 3-char and 6-char hex — assert we got hex values back
    for (const c of res.body.colors) {
      expect(c.hex).toMatch(/^#[0-9a-fA-F]{3,6}$/);
    }
  });

  it('POST /api/ai/extract-colors handles text with no hex codes', async () => {
    const res = await request(app)
      .post('/api/ai/extract-colors')
      .send({ text: 'no colors here' });
    expect(res.status).toBe(200);
    expect(res.body.colors).toEqual([]);
  });

  it('POST /api/ai/generate-brand-asset returns 400 without required fields', async () => {
    const res = await request(app)
      .post('/api/ai/generate-brand-asset')
      .send({ logoUrl: 'https://example.com/logo.png' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('POST /api/ai/generate-brand-asset returns placeholder image', async () => {
    const res = await request(app)
      .post('/api/ai/generate-brand-asset')
      .send({ logoUrl: 'https://example.com/logo.png', prompt: 'brand banner' });
    expect(res.status).toBe(200);
    expect(res.body.imageUrl).toMatch(/^data:image\/png;base64,/);
  });
});

describe('Auth Middleware', () => {
  // Tests using /api/search which is behind optionalApiKeyAuth
  const originalApiKey = process.env.API_KEY;

  afterEach(() => {
    if (originalApiKey) {
      process.env.API_KEY = originalApiKey;
    } else {
      delete process.env.API_KEY;
    }
  });

  it('allows requests when no API_KEY is configured (dev mode)', async () => {
    delete process.env.API_KEY;
    delete process.env.NODE_ENV;
    // /api/search will fail downstream but should pass auth
    const res = await request(app).get('/api/search/health');
    // Should not be 401 or 403
    expect([401, 403]).not.toContain(res.status);
  });

  it('rejects requests without API key when API_KEY is set', async () => {
    process.env.API_KEY = 'test-secret-key';
    const res = await request(app).get('/api/search/health');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/API key required/i);
  });

  it('rejects requests with wrong API key', async () => {
    process.env.API_KEY = 'test-secret-key';
    const res = await request(app)
      .get('/api/search/health')
      .set('X-API-Key', 'wrong-key');
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('accepts requests with correct API key via header', async () => {
    process.env.API_KEY = 'test-secret-key';
    const res = await request(app)
      .get('/api/search/health')
      .set('X-API-Key', 'test-secret-key');
    expect([401, 403]).not.toContain(res.status);
  });

  it('accepts requests with correct API key via query param', async () => {
    process.env.API_KEY = 'test-secret-key';
    const res = await request(app)
      .get('/api/search/health')
      .query({ apiKey: 'test-secret-key' });
    expect([401, 403]).not.toContain(res.status);
  });
});
