/**
 * @jest-environment node
 */
import request from 'supertest';
import { app } from '../../api/server';

// ─── Mock Firebase Admin SDK ────────────────────────────────────────────────
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDoc = jest.fn(() => ({ get: mockGet, set: mockSet }));
const mockCollection = jest.fn(() => ({ doc: mockDoc }));
const mockGetFirestore = jest.fn(() => ({ collection: mockCollection, doc: mockDoc }));

jest.mock('../../api/firebaseAdmin', () => ({
  isAdminInitialized: jest.fn(() => true),
  getFirestore: () => mockGetFirestore(),
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

// Capture the verify token that the webhooks module loaded at import time
// (from .env or the hardcoded fallback). Module-level const can't be changed at runtime.
const LOADED_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'your-webhook-verify-token-here';

describe('Webhook Routes — GET /api/webhooks/instagram (verification)', () => {
  it('returns challenge when verify token matches', async () => {
    const res = await request(app)
      .get('/api/webhooks/instagram')
      .query({
        'hub.mode': 'subscribe',
          'hub.verify_token': 'test-token',
        'hub.challenge': 'challenge-abc-123',
      });
    expect(res.status).toBe(200);
    expect(res.text).toBe('challenge-abc-123');
  });

  it('returns 403 when verify token does not match', async () => {
    const res = await request(app)
      .get('/api/webhooks/instagram')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': 'challenge-123',
      });
    expect(res.status).toBe(403);
  });

  it('returns 400 when mode or token are missing', async () => {
    const res = await request(app).get('/api/webhooks/instagram');
    expect(res.status).toBe(400);
  });
});

describe('Webhook Routes — POST /api/webhooks/instagram (events)', () => {
  beforeEach(() => {
    mockGet.mockResolvedValue({ exists: false });
    mockSet.mockResolvedValue(undefined);
  });

  const generateSignature = (body: any) => {
    const crypto = require('crypto');
    const secret = process.env.INSTAGRAM_CLIENT_SECRET || 'test-secret';
    return `sha256=${crypto.createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex')}`;
  };

  it('returns 200 EVENT_RECEIVED for valid instagram webhook', async () => {
    const body = {
      object: 'instagram',
      entry: [
        {
          changes: [
            { field: 'comments', value: { id: 'comment-1', text: 'Great post!' } },
          ],
        },
      ],
    };
    const res = await request(app)
      .post('/api/webhooks/instagram')
      .set('x-hub-signature-256', generateSignature(body))
      .send(body);
    expect(res.status).toBe(200);
    expect(res.text).toBe('EVENT_RECEIVED');
  });

  it('returns 200 for message events', async () => {
    const body = {
      object: 'instagram',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: { mid: 'msg-1', message: { text: 'Hello' }, sender: { id: 's1' } },
            },
          ],
        },
      ],
    };
    const res = await request(app)
      .post('/api/webhooks/instagram')
      .set('x-hub-signature-256', generateSignature(body))
      .send(body);
    expect(res.status).toBe(200);
  });

  it('returns 200 for media events', async () => {
    const body = {
      object: 'instagram',
      entry: [
        {
          changes: [
            { field: 'media', value: { media_id: 'media-1', caption: 'New post' } },
          ],
        },
      ],
    };
    const res = await request(app)
      .post('/api/webhooks/instagram')
      .set('x-hub-signature-256', generateSignature(body))
      .send(body);
    expect(res.status).toBe(200);
  });

  it('returns 200 for mention events', async () => {
    const body = {
      object: 'instagram',
      entry: [
        {
          changes: [
            { field: 'mentions', value: { comment_id: 'c1', from: { id: 'u1' } } },
          ],
        },
      ],
    };
    const res = await request(app)
      .post('/api/webhooks/instagram')
      .set('x-hub-signature-256', generateSignature(body))
      .send(body);
    expect(res.status).toBe(200);
  });

  it('returns 404 for non-instagram object', async () => {
    const body = { object: 'page', entry: [] };
    const res = await request(app)
      .post('/api/webhooks/instagram')
      .set('x-hub-signature-256', generateSignature(body))
      .send(body);
    expect(res.status).toBe(404);
  });

  it('handles multiple entries and changes', async () => {
    const body = {
      object: 'instagram',
      entry: [
        {
          changes: [
            { field: 'comments', value: { id: 'c1', text: 'Comment 1' } },
            { field: 'messages', value: { mid: 'm1', message: { text: 'Msg 1' } } },
          ],
        },
        {
          changes: [
            { field: 'media', value: { media_id: 'media-2' } },
          ],
        },
      ],
    };
    const res = await request(app)
      .post('/api/webhooks/instagram')
      .set('x-hub-signature-256', generateSignature(body))
      .send(body);
    expect(res.status).toBe(200);
  });

  it('handles unknown field types gracefully', async () => {
    const body = {
      object: 'instagram',
      entry: [
        {
          changes: [
            { field: 'unknown_field', value: { data: 'test' } },
          ],
        },
      ],
    };
    const res = await request(app)
      .post('/api/webhooks/instagram')
      .set('x-hub-signature-256', generateSignature(body))
      .send(body);
    expect(res.status).toBe(200);
  });

  it('returns 401 Unauthorized for missing signature', async () => {
    const res = await request(app)
      .post('/api/webhooks/instagram')
      .send({ object: 'instagram', entry: [] });
    expect(res.status).toBe(401);
  });

  it('returns 401 Unauthorized for invalid signature', async () => {
    const body = { object: 'instagram', entry: [] };
    const res = await request(app)
      .post('/api/webhooks/instagram')
      .set('x-hub-signature-256', 'sha256=invalid')
      .send(body);
    expect(res.status).toBe(401);
  });
});
