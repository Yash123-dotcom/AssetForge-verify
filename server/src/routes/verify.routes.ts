import { Router } from 'express';
import { verifyAsset } from '../controllers/verify.controller.js';
import { verifyLimiter } from '../middleware/rate-limits.js';
import { optionalAuth } from '../middleware/auth.js';

export const verifyRouter = Router();
verifyRouter.post('/', verifyLimiter, optionalAuth, verifyAsset);
