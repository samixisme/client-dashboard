/**
 * @jest-environment node
 */
import request from 'supertest';
import { app } from '../../api/server';

// ─── Mock dependencies ─────────────────────────────────────────────────────

jest.mock('../../api/firebaseAdmin', () => ({
  isAdminInitialized: jest.fn(() => false),
  getFirestore: jest.fn(),
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

// Mock node-fetch for paymenter proxy calls
jest.mock('node-fetch', () => {
  const mockFetch = jest.fn();
  return {
    __esModule: true,
    default: mockFetch,
  };
});

import fetch from 'node-fetch';
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

function createMockResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  } as any;
}

describe('Paymenter Routes — GET /api/paymenter/status', () => {
  const originalKey = process.env.PAYMENTER_API_KEY;

  afterEach(() => {
    if (originalKey) {
      process.env.PAYMENTER_API_KEY = originalKey;
    } else {
      delete process.env.PAYMENTER_API_KEY;
    }
    mockFetch.mockReset();
  });

  // Note: PAYMENTER_API_KEY is captured at module load from .env as a module-level const.
  // Changing process.env at runtime does NOT affect the already-captured value.
  // If .env has a real key, the module always sees it as configured.

  it('returns 200 when paymenter is reachable and API key is configured', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));
    const res = await request(app).get('/api/paymenter/status');
    // If PAYMENTER_API_KEY was set in .env at module load, status check succeeds
    if (process.env.PAYMENTER_API_KEY) {
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    } else {
      expect(res.status).toBe(503);
    }
  });

  it('returns 503 when paymenter is unreachable', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const res = await request(app).get('/api/paymenter/status');
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
  });
});

describe('Paymenter Routes — Clients', () => {
  beforeEach(() => {
    process.env.PAYMENTER_API_KEY = 'test-key';
    mockFetch.mockReset();
  });

  it('GET /api/paymenter/clients returns client list', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ data: [{ id: 1, name: 'Client A' }] }));
    const res = await request(app).get('/api/paymenter/clients');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/paymenter/clients returns 400 for invalid body', async () => {
    const res = await request(app)
      .post('/api/paymenter/clients')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/paymenter/clients creates client with valid body', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ id: 2, name: 'New Client' }));
    const res = await request(app)
      .post('/api/paymenter/clients')
      .send({ name: 'New Client', email: 'client@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Paymenter Routes — Subscriptions', () => {
  beforeEach(() => {
    process.env.PAYMENTER_API_KEY = 'test-key';
    mockFetch.mockReset();
  });

  it('GET /api/paymenter/subscriptions returns subscription list', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));
    const res = await request(app).get('/api/paymenter/subscriptions');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/paymenter/subscriptions/client/:id returns client subs', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));
    const res = await request(app).get('/api/paymenter/subscriptions/client/42');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/paymenter/subscriptions returns 400 for invalid body', async () => {
    const res = await request(app)
      .post('/api/paymenter/subscriptions')
      .send({ productId: 'not-a-number' });
    expect(res.status).toBe(400);
  });

  it('POST /api/paymenter/subscriptions creates subscription', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ id: 1 }));
    const res = await request(app)
      .post('/api/paymenter/subscriptions')
      .send({
        paymenterClientId: 1,
        productId: 2,
        billingCycle: 'monthly',
        price: 29.99,
        planName: 'Pro',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('PUT /api/paymenter/subscriptions/:id/cancel cancels sub', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));
    const res = await request(app).put('/api/paymenter/subscriptions/1/cancel');
    expect(res.status).toBe(200);
  });

  it('PUT /api/paymenter/subscriptions/:id/suspend suspends sub', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));
    const res = await request(app).put('/api/paymenter/subscriptions/1/suspend');
    expect(res.status).toBe(200);
  });

  it('PUT /api/paymenter/subscriptions/:id/unsuspend reactivates sub', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));
    const res = await request(app).put('/api/paymenter/subscriptions/1/unsuspend');
    expect(res.status).toBe(200);
  });
});

describe('Paymenter Routes — Invoices', () => {
  beforeEach(() => {
    process.env.PAYMENTER_API_KEY = 'test-key';
    mockFetch.mockReset();
  });

  it('GET /api/paymenter/invoices returns invoice list', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));
    const res = await request(app).get('/api/paymenter/invoices');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/paymenter/invoices/client/:id returns client invoices', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ data: [] }));
    const res = await request(app).get('/api/paymenter/invoices/client/5');
    expect(res.status).toBe(200);
  });

  it('POST /api/paymenter/invoices/:id/mark-paid marks invoice paid', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));
    const res = await request(app)
      .post('/api/paymenter/invoices/42/mark-paid')
      .send({ reference: 'BANK-REF-001' });
    expect(res.status).toBe(200);
  });

  it('handles downstream API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse('Internal Server Error', 500));
    const res = await request(app).get('/api/paymenter/clients');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
