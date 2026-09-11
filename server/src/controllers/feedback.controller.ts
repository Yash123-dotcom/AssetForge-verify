import { Request, Response } from 'express';
import { loadFeedbackSummary, submitFeedback } from '../services/feedback.service.js';
import { feedbackSchema, reportIdSchema } from '../validators/report.validator.js';
import { sendServiceError } from './error-response.js';

export async function createReportFeedback(request: Request, response: Response): Promise<void> {
  const id = reportIdSchema.safeParse(request.params.id);
  const body = feedbackSchema.safeParse(request.body);
  if (!id.success) {
    response.status(400).json({ error: id.error.issues[0]?.message ?? 'Invalid report ID.' });
    return;
  }
  if (!body.success) {
    response.status(400).json({ error: body.error.issues[0]?.message ?? 'Invalid feedback request.' });
    return;
  }
  try {
    await submitFeedback(id.data, body.data.outcome, body.data.comment);
    response.status(201).json({ message: 'Feedback recorded.' });
  } catch (error) { sendServiceError(error, response); }
}

export async function readFeedbackSummary(request: Request, response: Response): Promise<void> {
  const id = reportIdSchema.safeParse(request.params.id);
  if (!id.success) {
    response.status(400).json({ error: id.error.issues[0]?.message ?? 'Invalid report ID.' });
    return;
  }
  try { response.json(await loadFeedbackSummary(id.data)); }
  catch (error) { sendServiceError(error, response); }
}
