import { Router } from 'express'; import { analyzeAsset } from '../controllers/asset-analysis.controller.js'; import { assetAnalysisLimiter } from '../middleware/rate-limits.js';
export const assetAnalysisRouter = Router(); assetAnalysisRouter.post('/analyze', assetAnalysisLimiter, analyzeAsset);
