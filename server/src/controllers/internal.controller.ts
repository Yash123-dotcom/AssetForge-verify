import { createHash, timingSafeEqual } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { getBetaMetrics, getScoringAudit } from '../services/metrics.service.js';
import { sendServiceError } from './error-response.js';

export function requireInternalToken(request: Request, response: Response, next: NextFunction): void {
  const configured = process.env.INTERNAL_METRICS_TOKEN;
  if (process.env.NODE_ENV === 'production' && (!configured || configured.length < 32)) {
    response.locals.errorCode = 'INTERNAL_NOT_CONFIGURED';
    response.status(503).json({ code: 'INTERNAL_NOT_CONFIGURED', error: 'Internal metrics are not configured.' });
    return;
  }
  const supplied = /^Bearer ([A-Za-z0-9._~-]{16,256})$/i.exec(request.headers.authorization ?? '')?.[1];
  const configuredDigest = createHash('sha256').update(configured ?? '').digest();
  const suppliedDigest = createHash('sha256').update(supplied ?? '').digest();
  const valid = Boolean(configured && supplied && timingSafeEqual(configuredDigest, suppliedDigest));
  if (!valid) { response.locals.errorCode = 'INTERNAL_UNAUTHORIZED'; response.status(401).json({ code: 'INTERNAL_UNAUTHORIZED', error: 'Unauthorized.' }); return; }
  next();
}

export async function readBetaMetrics(_request: Request, response: Response): Promise<void> {
  try { response.json(await getBetaMetrics()); } catch (error) { sendServiceError(error, response); }
}

export async function readScoringAudit(_request: Request, response: Response): Promise<void> {
  try { response.json(await getScoringAudit()); } catch (error) { sendServiceError(error, response); }
}
