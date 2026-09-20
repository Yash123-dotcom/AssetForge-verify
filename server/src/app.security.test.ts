import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from './app.js';

describe('API transport security', () => {
  it('prevents API responses from being cached', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers.pragma).toBe('no-cache');
  });

  it('allows configured origins and does not reflect untrusted origins', async () => {
    const configuredOrigin = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173').split(',')[0]!.trim();
    const allowed = await request(app).options('/api/health').set('Origin', configuredOrigin).set('Access-Control-Request-Method', 'GET');
    expect(allowed.status).toBe(204);
    expect(allowed.headers['access-control-allow-origin']).toBe(configuredOrigin);

    const rejected = await request(app).options('/api/health').set('Origin', 'https://evil.example').set('Access-Control-Request-Method', 'GET');
    expect(rejected.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('returns a client error for malformed JSON', async () => {
    const response = await request(app).post('/api/events').set('Content-Type', 'application/json').send('{broken');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'INVALID_JSON', error: 'Request body must contain valid JSON.' });
  });
});
