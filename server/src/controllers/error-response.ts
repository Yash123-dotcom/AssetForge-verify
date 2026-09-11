import { Response } from 'express';
import { NotFoundError, PersistenceError } from '../lib/errors.js';

export function sendServiceError(error: unknown, response: Response): void {
  if (error instanceof NotFoundError) {
    response.status(404).json({ error: error.message });
    return;
  }
  if (error instanceof PersistenceError) {
    response.status(503).json({ error: error.message });
    return;
  }
  response.status(500).json({ error: 'An unexpected error occurred.' });
}
