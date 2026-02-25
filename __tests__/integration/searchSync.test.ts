/**
 * @jest-environment node
 */
import { runFullSync } from '../../api/searchSync';
import * as admin from 'firebase-admin';
import { meili } from '../../api/meiliClient';

jest.mock('firebase-admin', () => {
  const mockGet = jest.fn();
  const mockCollection = jest.fn(() => ({ get: mockGet }));
  const mockFirestore = jest.fn(() => ({ collection: mockCollection }));
  return {
    apps: ['app'],
    firestore: mockFirestore,
    initializeApp: jest.fn(),
    credential: { cert: jest.fn() }
  };
});

jest.mock('../../api/meiliClient', () => {
  const updateSettings = jest.fn();
  const addDocuments = jest.fn();
  const mockIndex = jest.fn(() => ({ updateSettings, addDocuments }));
  return {
    meili: { index: mockIndex },
  };
});

jest.mock('../../utils/googleDrive', () => ({
  listFiles: jest.fn().mockResolvedValue([]),
}));

describe('searchSync', () => {
  let mockGet: jest.Mock;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet = admin.firestore().collection('test').get as jest.Mock;
  });

  it('syncs collections properly', async () => {
    mockGet.mockResolvedValue({
      docs: [
        { id: '1', data: () => ({ name: 'Test' }) }
      ]
    });

    await runFullSync();
    expect(mockGet).toHaveBeenCalledTimes(7); // 7 collections synced
  });

  it('handles empty collections', async () => {
    mockGet.mockResolvedValue({ docs: [] });
    await runFullSync();
    expect(mockGet).toHaveBeenCalledTimes(7);
  });
  
  it('handles googleDrive errors gracefully', async () => {
    mockGet.mockResolvedValue({ docs: [] });
    const drive = require('../../utils/googleDrive');
    drive.listFiles.mockRejectedValueOnce(new Error('Drive error'));
    
    await runFullSync();
    expect(mockGet).toHaveBeenCalledTimes(7);
  });
});
