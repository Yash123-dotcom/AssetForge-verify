import { NextFunction, Request, Response } from 'express';
import { getSupabase } from '../lib/supabase.js';

export type AuthUser = { id: string; email: string };
export type AuthenticatedRequest = Request & { authUser?: AuthUser };

function bearerToken(request: Request): { present: boolean; token: string | null } {
  const header = request.headers.authorization;
  if (!header) return { present: false, token: null };
  const match = /^Bearer ([A-Za-z0-9._~-]{1,4096})$/i.exec(header);
  return { present: true, token: match?.[1] ?? null };
}

export async function optionalAuth(request: AuthenticatedRequest, response: Response, next: NextFunction): Promise<void> {
  const authorization = bearerToken(request);
  if (!authorization.present) { next(); return; }
  if (!authorization.token) {
    response.locals.errorCode = 'AUTH_SESSION_INVALID';
    response.status(401).json({ code: 'AUTH_SESSION_INVALID', error: 'The authorization header is invalid.' });
    return;
  }
  try {
    const { data, error } = await getSupabase().auth.getUser(authorization.token);
    if (error || !data.user) {
      response.locals.errorCode = 'AUTH_SESSION_INVALID';
      response.status(401).json({ code: 'AUTH_SESSION_INVALID', error: 'Your session has expired. Sign in again.' });
      return;
    }
    request.authUser = { id: data.user.id, email: data.user.email ?? '' };
    next();
  } catch {
    response.locals.errorCode = 'AUTH_UNAVAILABLE';
    response.status(503).json({ code: 'AUTH_UNAVAILABLE', error: 'Authentication is temporarily unavailable.' });
  }
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
