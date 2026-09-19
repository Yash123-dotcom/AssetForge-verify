import { Router } from 'express';
import { readBetaMetrics, readScoringAudit, requireInternalToken } from '../controllers/internal.controller.js';
import { reportReadLimiter } from '../middleware/rate-limits.js';
import { grantAccountCredits } from '../controllers/account.controller.js';

export const internalRouter = Router();
internalRouter.use(reportReadLimiter, requireInternalToken);
internalRouter.get('/beta-metrics', readBetaMetrics);
internalRouter.get('/scoring-audit', readScoringAudit);
internalRouter.post('/grant-credits', grantAccountCredits);
