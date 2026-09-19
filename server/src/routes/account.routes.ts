import { Router } from 'express';
import { readAccount, readBalance } from '../controllers/account.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { reportReadLimiter } from '../middleware/rate-limits.js';

export const accountRouter = Router();
accountRouter.use(reportReadLimiter, requireAuth);
accountRouter.get('/', readAccount);
accountRouter.get('/credits', readBalance);
