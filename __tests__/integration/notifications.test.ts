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

// Mock Novu to avoid real API calls
jest.mock('@novu/api', () => ({
  Novu: jest.fn().mockImplementation(() => ({
    trigger: jest.fn().mockResolvedValue({ data: { acknowledged: true } }),
    subscribers: {
      messages: {
        markAs: jest.fn().mockResolvedValue({}),
      },
    },
  })),
}));

describe('Notification Routes — POST /api/notifications/trigger', () => {
  it('returns 400 when workflowId is missing', async () => {
    const res = await request(app)
      .post('/api/notifications/trigger')
      .send({ subscriberId: 'user-1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when subscriberId is missing', async () => {
    const res = await request(app)
      .post('/api/notifications/trigger')
      .send({ workflowId: 'welcome' });
    expect(res.status).toBe(400);
  });

  it('triggers notification with valid payload', async () => {
    const res = await request(app)
      .post('/api/notifications/trigger')
      .send({
        workflowId: 'task-assigned',
        subscriberId: 'user-123',
        payload: { taskName: 'Design review' },
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('triggers notification without optional payload', async () => {
    const res = await request(app)
      .post('/api/notifications/trigger')
      .send({
        workflowId: 'welcome',
        subscriberId: 'user-456',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Notification Routes — PATCH /api/notifications/messages/:messageId/seen', () => {
  it('returns 400 when subscriberId query is missing', async () => {
    const res = await request(app)
      .patch('/api/notifications/messages/msg-1/seen');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/subscriberId/i);
  });

  it('marks message as seen with valid params', async () => {
    const res = await request(app)
      .patch('/api/notifications/messages/msg-1/seen')
      .query({ subscriberId: 'user-123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
