import cors from 'cors';
import express from 'express';
import {
  contentSecurityPolicy,
  crossOriginOpenerPolicy,
  crossOriginResourcePolicy,
  originAgentCluster,
  referrerPolicy,
  strictTransportSecurity,
  xContentTypeOptions,
  xDnsPrefetchControl,
  xDownloadOptions,
  xFrameOptions,
  xPermittedCrossDomainPolicies,
  xPoweredBy,
  xXssProtection,
} from 'helmet';
import { verifyRouter } from './routes/verify.routes.js';
import { reportRouter } from './routes/report.routes.js';
import { assetAnalysisRouter } from './routes/asset-analysis.routes.js';
import { eventRouter } from './routes/event.routes.js';
import { internalRouter } from './routes/internal.routes.js';
import { requestLogger } from './middleware/request-logger.js';
import { deepScanRouter } from './routes/deep-scan.routes.js';

const allowedOrigins = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function configuredProxyHops(): number {
  const raw = process.env.TRUST_PROXY_HOPS?.trim();
  if (!raw) return 0;
  const hops = Number(raw);
  if (!Number.isInteger(hops) || hops < 0 || hops > 10) {
    throw new Error('TRUST_PROXY_HOPS must be an integer between 0 and 10.');
  }
  return hops;
}

export const app = express();
const proxyHops = configuredProxyHops();
if (proxyHops > 0) app.set('trust proxy', proxyHops);
app.disable('x-powered-by');
app.use(
  contentSecurityPolicy(),
  crossOriginOpenerPolicy(),
  crossOriginResourcePolicy(),
  originAgentCluster(),
  referrerPolicy(),
  strictTransportSecurity(),
  xContentTypeOptions(),
  xDnsPrefetchControl(),
  xDownloadOptions(),
  xFrameOptions(),
  xPermittedCrossDomainPolicies(),
  xPoweredBy(),
  xXssProtection(),
);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '32kb' }));
app.use(requestLogger);
app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
app.use('/api/verify', verifyRouter);
app.use('/api/reports', reportRouter);
app.use('/api/assets', assetAnalysisRouter);
app.use('/api/events', eventRouter);
app.use('/api/internal', internalRouter);
app.use('/api/deep-scan', deepScanRouter);
app.use((_request, response) => { response.locals.errorCode = 'NOT_FOUND'; response.status(404).json({ code: 'NOT_FOUND', error: 'Not found' }); });
