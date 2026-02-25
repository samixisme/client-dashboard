import request from 'supertest';
import { app } from '../../api/server';

describe('API Proxy Routes Integration', () => {
  it('should return 400 if missing url parameter', async () => {
    // missing url parameter
    const res = await request(app).get('/api/proxy');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'URL parameter is required and must be a string' });
  });
  
  it('should return 400 if url is invalid', async () => {
    const res = await request(app).get('/api/proxy?url=invalid');
    expect(res.status).toBe(400);
    // Error message depends on validateUrl implementation, but it will be 400
  });
});
