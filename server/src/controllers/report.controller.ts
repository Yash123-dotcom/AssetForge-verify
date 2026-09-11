import { Request, Response } from 'express';
import { getReport } from '../services/report.service.js';
import { reportIdSchema } from '../validators/report.validator.js';
import { sendServiceError } from './error-response.js';

export async function readReport(request: Request, response: Response): Promise<void> {
  const validation = reportIdSchema.safeParse(request.params.id);
  if (!validation.success) {
    response.status(400).json({ error: validation.error.issues[0]?.message ?? 'Invalid report ID.' });
    return;
  }
  try { response.json(await getReport(validation.data)); }
  catch (error) { sendServiceError(error, response); }
}
