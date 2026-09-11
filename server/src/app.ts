import cors from 'cors';
import express from 'express';
import { verifyRouter } from './routes/verify.routes.js';
import { reportRouter } from './routes/report.routes.js';
import { assetAnalysisRouter } from './routes/asset-analysis.routes.js';

const allowedOrigins = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim());

export const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '32kb' }));
app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
app.use('/api/verify', verifyRouter);
app.use('/api/reports', reportRouter);
app.use('/api/assets', assetAnalysisRouter);
app.use((_request, response) => response.status(404).json({ error: 'Not found' }));
