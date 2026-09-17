import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

export function requestLogger(request: Request, response: Response, next: NextFunction): void {
  const requestId = randomUUID();
  const startedAt = performance.now();
  response.setHeader('X-Request-Id', requestId);
  response.on('finish', () => {
    const record = {
      request_id: requestId,
      route: request.path,
      status: response.statusCode,
      duration_ms: Math.round(performance.now() - startedAt),
      error_code: response.locals.errorCode ?? (response.statusCode >= 400 ? 'HTTP_ERROR' : null),
    };
    console.info(JSON.stringify(record));
  });
  next();
}
