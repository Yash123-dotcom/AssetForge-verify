import { Router } from 'express';
import { verifyAsset } from '../controllers/verify.controller.js';
import { verifyLimiter } from '../middleware/rate-limits.js';

export const verifyRouter = Router();
verifyRouter.post('/', verifyLimiter, verifyAsset);
