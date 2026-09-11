import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createReportFeedback, readFeedbackSummary } from '../controllers/feedback.controller.js';
import { readReport } from '../controllers/report.controller.js';

export const reportRouter = Router();
const feedbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many feedback attempts. Please try again later.' },
});

reportRouter.get('/:id', readReport);
reportRouter.get('/:id/feedback-summary', readFeedbackSummary);
reportRouter.post('/:id/feedback', feedbackLimiter, createReportFeedback);
