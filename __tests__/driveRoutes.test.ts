/**
 * @jest-environment node
 */
import request from 'supertest';
import { app } from '../api/server';

// Mock the Google Drive utilities
jest.mock('../utils/googleDrive', () => ({
  initializeDrive: jest.fn(),
  listFiles: jest.fn(),
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  getFileMetadata: jest.fn(),
  getFolderId: jest.fn(),
}));

// Mock driveQuota
jest.mock('../utils/driveQuota', () => ({
  getQuotaStats: jest.fn(() => ({ reads: 0, writes: 0 })),
  checkQuota: jest.fn(() => true),
}));

// Mock driveCache
jest.mock('../utils/driveCache', () => ({
  getDriveCache: jest.fn(),
  setDriveCache: jest.fn(),
  getFolderCache: jest.fn(),
  setFolderCache: jest.fn(),
}));

// Mock Firebase Admin (used by authMiddleware)
jest.mock('../api/firebaseAdmin', () => ({
  isAdminInitialized: false,
  adminAuth: null,
}));

// Mock logger
jest.mock('../api/logger', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  __esModule: true,
}));

import { initializeDrive } from '../utils/googleDrive';

const mockInitializeDrive = initializeDrive as jest.MockedFunction<typeof initializeDrive>;

describe('GET /api/drive/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 when Drive initializes successfully', async () => {
    mockInitializeDrive.mockResolvedValueOnce(undefined);

    const res = await request(app).get('/api/drive/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      message: 'Google Drive API is reachable',
    });
    expect(res.body).toHaveProperty('rootFolderId');
    expect(res.body).toHaveProperty('credentialSource');
    expect(mockInitializeDrive).toHaveBeenCalledTimes(1);
  });

  it('returns 503 when Drive initialization fails', async () => {
    mockInitializeDrive.mockRejectedValueOnce(new Error('Missing service account credentials'));

    const res = await request(app).get('/api/drive/health');

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      status: 'error',
      message: 'Missing service account credentials',
    });
    expect(mockInitializeDrive).toHaveBeenCalledTimes(1);
  });

  it('handles non-Error thrown values gracefully', async () => {
    mockInitializeDrive.mockRejectedValueOnce('string error');

    const res = await request(app).get('/api/drive/health');

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      status: 'error',
      message: 'Drive initialization failed',
    });
  });
});
