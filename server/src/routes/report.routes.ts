import { Router } from 'express';
import { createReportFeedback, readFeedbackSummary } from '../controllers/feedback.controller.js';
import { readReport } from '../controllers/report.controller.js';
import { feedbackLimiter, reportReadLimiter } from '../middleware/rate-limits.js';
import { createReportUsefulness } from '../controllers/usefulness.controller.js';

export const reportRouter = Router();
reportRouter.get('/:id', reportReadLimiter, readReport);
reportRouter.get('/:id/feedback-summary', reportReadLimiter, readFeedbackSummary);
reportRouter.post('/:id/feedback', feedbackLimiter, createReportFeedback);
reportRouter.post('/:id/usefulness', feedbackLimiter, createReportUsefulness);
