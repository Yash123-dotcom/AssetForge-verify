import { NextFunction, Request, Response } from 'express';
import { getSupabase } from '../lib/supabase.js';

export type AuthUser = { id: string; email: string };
export type AuthenticatedRequest = Request & { authUser?: AuthUser };

function bearerToken(request: Request): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

export async function optionalAuth(request: AuthenticatedRequest, response: Response, next: NextFunction): Promise<void> {
  const token = bearerToken(request);
  if (!token) { next(); return; }
  const { data, error } = await getSupabase().auth.getUser(token);
  if (error || !data.user) {
    response.locals.errorCode = 'AUTH_SESSION_INVALID';
    response.status(401).json({ code: 'AUTH_SESSION_INVALID', error: 'Your session has expired. Sign in again.' });
    return;
  }
  request.authUser = { id: data.user.id, email: data.user.email ?? '' };
  next();
}

export async function requireAuth(request: AuthenticatedRequest, response: Response, next: NextFunction): Promise<void> {
  await optionalAuth(request, response, () => {
    if (!request.authUser) {
      response.locals.errorCode = 'AUTH_REQUIRED';
      response.status(401).json({ code: 'AUTH_REQUIRED', error: 'Sign in to continue.' });
      return;
    }
    next();
  });
}
