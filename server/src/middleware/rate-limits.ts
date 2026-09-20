import { rateLimit } from 'express-rate-limit';
import { SupabaseRateLimitStore } from './rate-limit-store.js';

const WINDOW_MS = 15 * 60 * 1000;

function limiter(identifier: string, limit: number, message: string) {
  const storeMode = process.env.RATE_LIMIT_STORE?.toLowerCase()
    ?? (process.env.NODE_ENV === 'production' ? 'supabase' : 'memory');
  if (!['memory', 'supabase'].includes(storeMode)) {
    throw new Error('RATE_LIMIT_STORE must be either memory or supabase.');
  }
  const sharedStore = storeMode === 'supabase'
    ? new SupabaseRateLimitStore(`assetforge:${identifier}`)
    : undefined;
  return rateLimit({
    windowMs: WINDOW_MS,
    limit,
    identifier,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: message },
    passOnStoreError: false,
    ...(sharedStore ? { store: sharedStore } : {}),
  });
}

export const verifyLimiter = limiter('verify', 30, 'Too many verification attempts. Please try again later.');
export const feedbackLimiter = limiter('feedback', 10, 'Too many feedback attempts. Please try again later.');
export const assetAnalysisLimiter = limiter('asset-analysis', 20, 'Too many analysis attempts. Please try again later.');
export const reportReadLimiter = limiter('report-read', 120, 'Too many report requests. Please try again later.');
export const analyticsLimiter = limiter('analytics', 120, 'Too many analytics events. Please try again later.');
export const deepScanLimiter = limiter('deep-scan', 5, 'Too many Deep Scan attempts. Please try again later.');
export const checkoutLimiter = limiter('checkout', 10, 'Too many checkout attempts. Please try again later.');
