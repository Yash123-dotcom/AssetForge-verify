import { Request, Response } from 'express';
import { createBetaEvent } from '../repositories/metrics.repository.js';
import { betaEventSchema } from '../validators/event.validator.js';
import { sendServiceError } from './error-response.js';

export async function recordBetaEvent(request: Request, response: Response): Promise<void> {
  const body = betaEventSchema.safeParse(request.body);
  if (!body.success) { response.locals.errorCode = 'EVENT_INVALID'; response.status(400).json({ code: 'EVENT_INVALID', error: 'Invalid analytics event.' }); return; }
  try {
    await createBetaEvent(body.data.event, body.data.durationMs, body.data.isDemo);
    response.status(202).json({ message: 'Event recorded.' });
  } catch (error) { sendServiceError(error, response); }
}
