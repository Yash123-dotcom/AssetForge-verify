import { Router } from 'express';
import { createDeepScan } from '../controllers/deep-scan.controller.js';
import { deepScanLimiter } from '../middleware/rate-limits.js';
import { requireAuth } from '../middleware/auth.js';

export const deepScanRouter = Router();
deepScanRouter.post('/', deepScanLimiter, requireAuth, createDeepScan);
