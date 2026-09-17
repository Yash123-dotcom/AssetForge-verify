import { Request, Response } from 'express';
import { submitUsefulness } from '../services/usefulness.service.js';
import { reportIdSchema, usefulnessSchema } from '../validators/report.validator.js';
import { sendServiceError } from './error-response.js';

export async function createReportUsefulness(request: Request, response: Response): Promise<void> {
  const id = reportIdSchema.safeParse(request.params.id);
  const body = usefulnessSchema.safeParse(request.body);
  if (!id.success || !body.success) {
    response.locals.errorCode = 'FEEDBACK_INVALID';
    response.status(400).json({ code: 'FEEDBACK_INVALID', error: 'Invalid usefulness response.' });
    return;
  }
  try {
    await submitUsefulness(id.data, body.data.rating, body.data.comment);
    response.status(201).json({ message: 'Usefulness response recorded.' });
  } catch (error) { sendServiceError(error, response); }
}
