import { Router } from 'express';
import { verifyAsset } from '../controllers/verify.controller.js';

export const verifyRouter = Router();
verifyRouter.post('/', verifyAsset);
