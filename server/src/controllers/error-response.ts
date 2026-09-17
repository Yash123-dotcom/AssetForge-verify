import { Response } from 'express';
import { AssetFetchTimeoutError, DeepScanError, NotFoundError, PersistenceError } from '../lib/errors.js';

export function sendServiceError(error: unknown, response: Response): void {
  if (error instanceof DeepScanError) {
    response.locals.errorCode = error.code;
    response.status(error.status).json({ code: error.code, error: error.message });
    return;
  }
  if (error instanceof NotFoundError) {
    response.locals.errorCode = error.code;
    response.status(404).json({ code: error.code, error: error.message });
    return;
  }
  if (error instanceof AssetFetchTimeoutError) {
    response.locals.errorCode = error.code;
    response.status(504).json({ code: error.code, error: error.message });
    return;
  }
  if (error instanceof PersistenceError) {
    response.locals.errorCode = error.code;
    response.status(503).json({ code: error.code, error: error.message });
    return;
  }
  response.locals.errorCode = 'INTERNAL_ERROR';
  response.status(500).json({ code: 'INTERNAL_ERROR', error: 'An unexpected error occurred.' });
}
