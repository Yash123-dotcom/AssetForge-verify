import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase.js', () => ({
  getSupabase: () => ({ auth: { getUser: vi.fn(async (token: string) => token === 'valid-session' ? { data: { user: { id: 'user-1', email: 'user@example.com' } }, error: null } : { data: { user: null }, error: new Error('invalid') }) } }),
}));

const { optionalAuth, requireAuth } = await import('./auth.js');
const app = express();
app.get('/optional', optionalAuth, (req, res) => res.json({ userId: (req as typeof req & { authUser?: { id: string } }).authUser?.id ?? null }));
app.get('/private', requireAuth, (req, res) => res.json({ userId: (req as typeof req & { authUser?: { id: string } }).authUser?.id }));

describe('Supabase session authorization', () => {
  it('keeps anonymous routes available without a token', async () => {
    const response = await request(app).get('/optional');
    expect(response.status).toBe(200); expect(response.body.userId).toBeNull();
  });

  it('accepts a server-verified user access token', async () => {
    const response = await request(app).get('/private').set('Authorization', 'Bearer valid-session');
    expect(response.status).toBe(200); expect(response.body.userId).toBe('user-1');
  });

  it('rejects missing and expired sessions on protected routes', async () => {
    expect((await request(app).get('/private')).status).toBe(401);
    const expired = await request(app).get('/private').set('Authorization', 'Bearer expired-session');
    expect(expired.status).toBe(401); expect(expired.body.code).toBe('AUTH_SESSION_INVALID');
  });
});
