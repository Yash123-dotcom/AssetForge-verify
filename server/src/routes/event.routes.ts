import { Router } from 'express';
import { recordBetaEvent } from '../controllers/event.controller.js';
import { analyticsLimiter } from '../middleware/rate-limits.js';

export const eventRouter = Router();
eventRouter.post('/', analyticsLimiter, recordBetaEvent);
