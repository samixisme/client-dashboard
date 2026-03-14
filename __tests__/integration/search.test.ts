/**
 * @jest-environment node
 */
import request from 'supertest';
import { app } from '../../api/server';

jest.mock('../../api/meiliClient', () => {
  const multiSearch = jest.fn();
  const index = jest.fn(() => ({
    addDocuments: jest.fn(),
  }));
  return {
    getMeili: jest.fn(() => ({ multiSearch, index })),
  };
});

jest.mock('../../api/searchSync', () => ({
  runFullSync: jest.fn().mockResolvedValue(true),
}));

describe('Search Routes', () => {
  describe('GET /api/search', () => {
    it('returns empty results if no query is provided', async () => {
      const res = await request(app).get('/api/search');
      expect(res.status).toBe(200);
      expect(res.body.query).toBe('');
      expect(res.body.results).toEqual({});
    });

    it('returns empty results gracefully if MeiliSearch is not configured', async () => {
      const { getMeili } = require('../../api/meiliClient');
      getMeili.mockImplementationOnce(() => { throw new Error('Not configured'); });
      const res = await request(app).get('/api/search?q=test');
      expect(res.status).toBe(200);
      expect(res.body.query).toBe('test');
      expect(res.body.results).toEqual({});
    });

    it('performs multi-search successfully', async () => {
      const { getMeili } = require('../../api/meiliClient');
      const mockMultiSearch = jest.fn().mockResolvedValue({
        results: [
          { indexUid: 'projects', hits: [{ id: '1', title: 'Test Project' }], estimatedTotalHits: 1 },
          { indexUid: 'tasks', hits: [], estimatedTotalHits: 0 },
        ],
      });
      getMeili.mockReturnValueOnce({ multiSearch: mockMultiSearch });

      const res = await request(app).get('/api/search?q=test&types=projects,tasks');
      expect(res.status).toBe(200);
      expect(res.body.query).toBe('test');
      expect(res.body.results.projects.hits).toHaveLength(1);
      expect(res.body.results.tasks.hits).toHaveLength(0);
      expect(mockMultiSearch).toHaveBeenCalledWith({
        queries: [
        { indexUid: 'projects', q: 'test', limit: 5, offset: 0, attributesToHighlight: ['*'], highlightPreTag: '<mark>', highlightPostTag: '</mark>', showMatchesPosition: true },
        { indexUid: 'tasks', q: 'test', limit: 5, offset: 0, attributesToHighlight: ['*'], highlightPreTag: '<mark>', highlightPostTag: '</mark>', showMatchesPosition: true },
        ],
      });
    });

    it('returns 500 on multiSearch error', async () => {
      const { getMeili } = require('../../api/meiliClient');
      const mockMultiSearch = jest.fn().mockRejectedValue(new Error('Meili error'));
      getMeili.mockReturnValueOnce({ multiSearch: mockMultiSearch });

      const res = await request(app).get('/api/search?q=test');
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Search failed');
    });
  });

  describe('POST /api/search/sync', () => {
    it('starts full sync in background', async () => {
      const { runFullSync } = require('../../api/searchSync');
      const res = await request(app).post('/api/search/sync');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Full sync started in background');
      expect(runFullSync).toHaveBeenCalled();
    });
  });

  describe('POST /api/search/sync/:type/:id', () => {
    it('returns 400 for unknown index type', async () => {
      const res = await request(app).post('/api/search/sync/unknown/1').send({ title: 'test' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Unknown index type');
    });

    it('returns 400 for invalid body', async () => {
      // express.json() ignores malformed json and returns empty object, so send a string via set headers or null via JSON
      const res = await request(app).post('/api/search/sync/projects/1').send(null).set('Content-Type', 'application/json');
      expect(res.status).toBe(400);
    });

    it('adds document successfully', async () => {
      const { getMeili } = require('../../api/meiliClient');
      const mockAddDocs = jest.fn().mockResolvedValue(true);
      getMeili.mockReturnValueOnce({ index: () => ({ addDocuments: mockAddDocs }) });

      const res = await request(app).post('/api/search/sync/projects/1').send({ title: 'test' });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(mockAddDocs).toHaveBeenCalledWith([{ title: 'test', id: '1' }]);
    });

    it('returns 500 on addDocuments error', async () => {
      const { getMeili } = require('../../api/meiliClient');
      const mockAddDocs = jest.fn().mockRejectedValue(new Error('Add docs error'));
      getMeili.mockReturnValueOnce({ index: () => ({ addDocuments: mockAddDocs }) });

      const res = await request(app).post('/api/search/sync/projects/1').send({ title: 'test' });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Partial sync failed');
    });
  });
});
