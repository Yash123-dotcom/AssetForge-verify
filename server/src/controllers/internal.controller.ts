import { timingSafeEqual } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { getBetaMetrics, getScoringAudit } from '../services/metrics.service.js';
import { sendServiceError } from './error-response.js';

export function requireInternalToken(request: Request, response: Response, next: NextFunction): void {
  const configured = process.env.INTERNAL_METRICS_TOKEN;
  const supplied = request.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '';
  const valid = Boolean(configured && supplied && configured.length === supplied.length && timingSafeEqual(Buffer.from(configured), Buffer.from(supplied)));
  if (!valid) { response.locals.errorCode = 'INTERNAL_UNAUTHORIZED'; response.status(401).json({ code: 'INTERNAL_UNAUTHORIZED', error: 'Unauthorized.' }); return; }
  next();
}

export async function readBetaMetrics(_request: Request, response: Response): Promise<void> {
  try { response.json(await getBetaMetrics()); } catch (error) { sendServiceError(error, response); }
}

export async function readScoringAudit(_request: Request, response: Response): Promise<void> {
  try { response.json(await getScoringAudit()); } catch (error) { sendServiceError(error, response); }
}
