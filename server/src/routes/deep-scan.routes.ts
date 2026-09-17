import { Router } from 'express';
import { createDeepScan } from '../controllers/deep-scan.controller.js';
import { deepScanLimiter } from '../middleware/rate-limits.js';

export const deepScanRouter = Router();
deepScanRouter.post('/', deepScanLimiter, createDeepScan);
