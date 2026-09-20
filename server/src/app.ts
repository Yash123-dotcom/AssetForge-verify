import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
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
import { accountRouter } from './routes/account.routes.js';
import { paymentRouter, paymentWebhookRouter } from './routes/payment.routes.js';

function configuredOrigins(): string[] {
  const configured = process.env.CLIENT_ORIGIN?.trim();
  if (!configured && process.env.NODE_ENV === 'production') throw new Error('CLIENT_ORIGIN is required in production.');
  const values = (configured || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((origin) => origin.trim()).filter(Boolean);
  return values.map((value) => {
    let url: URL;
    try { url = new URL(value); } catch { throw new Error(`CLIENT_ORIGIN contains an invalid origin: ${value}`); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw new Error(`CLIENT_ORIGIN must contain only HTTP(S) origins: ${value}`);
    }
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new Error('CLIENT_ORIGIN must use HTTPS in production.');
    return url.origin;
  });
}

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
const allowedOrigins = configuredOrigins();
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
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'HEAD', 'POST', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  exposedHeaders: ['RateLimit', 'RateLimit-Policy', 'X-Request-Id'],
  maxAge: 600,
}));
app.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Pragma', 'no-cache');
  next();
});
app.use('/api/payments/webhooks', paymentWebhookRouter);
app.use(express.json({ limit: '32kb' }));
app.use(requestLogger);
app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
app.use('/api/verify', verifyRouter);
app.use('/api/reports', reportRouter);
app.use('/api/assets', assetAnalysisRouter);
app.use('/api/events', eventRouter);
app.use('/api/internal', internalRouter);
app.use('/api/deep-scan', deepScanRouter);
app.use('/api/account', accountRouter);
app.use('/api/payments', paymentRouter);
app.use((_request, response) => { response.locals.errorCode = 'NOT_FOUND'; response.status(404).json({ code: 'NOT_FOUND', error: 'Not found' }); });
app.use((error: unknown, _request: Request, response: Response, next: NextFunction) => {
  if (response.headersSent) { next(error); return; }
  if (error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed') {
    response.locals.errorCode = 'INVALID_JSON';
    response.status(400).json({ code: 'INVALID_JSON', error: 'Request body must contain valid JSON.' });
    return;
  }
  console.error({ code: 'UNHANDLED_ERROR', name: error instanceof Error ? error.name : 'UnknownError' });
  response.locals.errorCode = 'INTERNAL_ERROR';
  response.status(500).json({ code: 'INTERNAL_ERROR', error: 'An unexpected server error occurred.' });
});

export default app;
