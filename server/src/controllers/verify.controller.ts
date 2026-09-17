import { Request, Response } from 'express';
import { analyzeAndSaveReport } from '../services/report.service.js';
import { verifyRequestSchema } from '../validators/verify.validator.js';
import { sendServiceError } from './error-response.js';

export async function verifyAsset(request: Request, response: Response): Promise<void> {
  const validation = verifyRequestSchema.safeParse(request.body);
  if (!validation.success) {
    response.locals.errorCode = 'INVALID_VERIFICATION_REQUEST';
    response.status(400).json({
      code: 'INVALID_VERIFICATION_REQUEST',
      error: 'Invalid verification request',
      details: validation.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
    return;
  }
  try {
    response.status(201).json(await analyzeAndSaveReport(validation.data));
  } catch (error) {
    sendServiceError(error, response);
  }
}
