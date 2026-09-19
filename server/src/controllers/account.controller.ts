import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getAccountData, getCreditBalance, grantCredits } from '../repositories/account.repository.js';
import { sendServiceError } from './error-response.js';

export async function readAccount(request: AuthenticatedRequest, response: Response): Promise<void> {
  try { response.json(await getAccountData(request.authUser!.id)); } catch (error) { sendServiceError(error, response); }
}

export async function readBalance(request: AuthenticatedRequest, response: Response): Promise<void> {
  try { response.json(await getCreditBalance(request.authUser!.id)); } catch (error) { sendServiceError(error, response); }
}

const grantSchema = z.object({ userId: z.string().uuid(), amount: z.number().int().min(1).max(100), reason: z.string().trim().min(3).max(200) }).strict();
export async function grantAccountCredits(request: AuthenticatedRequest, response: Response): Promise<void> {
  const parsed = grantSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ code: 'INVALID_CREDIT_GRANT', error: 'Provide a user ID, credit amount, and reason.' }); return; }
  try { response.json({ availableCredits: await grantCredits(parsed.data.userId, parsed.data.amount, parsed.data.reason) }); } catch (error) { sendServiceError(error, response); }
}
