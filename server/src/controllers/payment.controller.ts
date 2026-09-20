import { Request, Response } from 'express';
import { z } from 'zod';
import { ServiceError } from '../lib/errors.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { getPaymentService } from '../payments/whop.provider.js';
import { CREDIT_PACKS, creditPack } from '../payments/pricing.config.js';
import { createBetaEvent } from '../repositories/metrics.repository.js';
import { checkoutStatus, completePurchase, createPendingPayment, failPayment, refundPayment } from '../repositories/payment.repository.js';
import { sendServiceError } from './error-response.js';

const checkoutSchema = z.object({ packId: z.enum(['DEEP_SCAN_1', 'DEEP_SCAN_5', 'DEEP_SCAN_15']), currency: z.literal('USD'), idempotencyKey: z.string().uuid() }).strict();
function frontendUrl(): string {
  const configured = process.env.APP_URL ?? process.env.CLIENT_ORIGIN?.split(',')[0];
  if (!configured) throw new ServiceError('PAYMENT_NOT_CONFIGURED', 'The application URL is not configured.', 503);
  let url: URL;
  try { url = new URL(configured); } catch { throw new ServiceError('PAYMENT_NOT_CONFIGURED', 'The application URL is invalid.', 503); }
  if (!['http:', 'https:'].includes(url.protocol) || (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) throw new ServiceError('PAYMENT_NOT_CONFIGURED', 'The application URL must use HTTPS in production.', 503);
  const allowedOrigins = (process.env.CLIENT_ORIGIN ?? '').split(',').map((value) => value.trim()).filter(Boolean).map((value) => {
    try { return new URL(value).origin; } catch { return ''; }
  });
  if (process.env.NODE_ENV === 'production' && !allowedOrigins.includes(url.origin)) throw new ServiceError('PAYMENT_NOT_CONFIGURED', 'The application URL must match an allowed client origin.', 503);
  return url.origin;
}

export function readPricing(_request: Request, response: Response): void {
  response.json({ packs: CREDIT_PACKS, defaultCurrency: 'USD', creditsExpire: false });
}

export async function createCheckout(request: AuthenticatedRequest, response: Response): Promise<void> {
  const parsed = checkoutSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ code: 'INVALID_CHECKOUT_REQUEST', error: 'Choose a valid credit pack and currency.' }); return; }
  try {
    const pack = creditPack(parsed.data.packId, parsed.data.currency); const base = frontendUrl();
    const checkout = await getPaymentService().createCheckout({ userId: request.authUser!.id, email: request.authUser!.email, packId: pack.id, credits: pack.credits, currency: pack.currency, planId: pack.providerPlanId, successUrl: `${base}/payment/success`, cancelUrl: `${base}/payment/cancelled`, idempotencyKey: parsed.data.idempotencyKey });
    await createPendingPayment({ userId: request.authUser!.id, checkoutId: checkout.checkoutId, clientReferenceId: parsed.data.idempotencyKey, packId: pack.id, currency: pack.currency, amount: pack.amount, credits: pack.credits });
    await createBetaEvent('checkout_started').catch(() => undefined);
    response.status(201).json({ checkoutId: checkout.checkoutId, url: checkout.url });
  } catch (error) { await createBetaEvent('checkout_failed').catch(() => undefined); sendServiceError(error, response); }
}

export async function receiveWhopWebhook(request: Request, response: Response): Promise<void> {
  try {
    if (!Buffer.isBuffer(request.body)) throw new ServiceError('INVALID_WEBHOOK_BODY', 'Payment webhook body must be raw.', 400);
    const id = request.headers['webhook-id']; const timestamp = request.headers['webhook-timestamp']; const signature = request.headers['webhook-signature'];
    if (typeof id !== 'string' || typeof timestamp !== 'string' || typeof signature !== 'string') throw new ServiceError('INVALID_WEBHOOK_SIGNATURE', 'Payment webhook signature headers are missing.', 400);
    const event = getPaymentService().verifyWebhook(request.body, { id, timestamp, signature });
    if (!event) { response.json({ received: true }); return; }
    if (event.type === 'PURCHASE_COMPLETED') {
      const configuredPack = creditPack(event.packId, event.currency);
      if (event.credits !== configuredPack.credits || event.amount !== configuredPack.amount) throw new ServiceError('PAYMENT_AMOUNT_MISMATCH', 'Verified payment details do not match the configured credit pack.', 400);
      const credited = await completePurchase({ ...event, credits: configuredPack.credits, amount: configuredPack.amount, packId: configuredPack.id });
      if (credited) { await createBetaEvent('checkout_completed').catch(() => undefined); await createBetaEvent('credit_added').catch(() => undefined); }
    } else if (event.type === 'PURCHASE_FAILED') await failPayment(event.id, event.checkoutId);
    else {
      const configuredPack = creditPack(event.packId, event.currency);
      if (event.amount >= configuredPack.amount) await refundPayment(event.id, event.paymentId);
    }
    response.json({ received: true });
  } catch (error) { sendServiceError(error, response); }
}

export async function readCheckoutStatus(request: AuthenticatedRequest, response: Response): Promise<void> {
  const id = z.string().regex(/^(?:ch_[A-Za-z0-9_-]{6,197}|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i).safeParse(request.params.id);
  if (!id.success) { response.status(400).json({ code: 'INVALID_CHECKOUT_ID', error: 'Invalid checkout identifier.' }); return; }
  try { response.json({ checkout: await checkoutStatus(request.authUser!.id, id.data) }); } catch (error) { sendServiceError(error, response); }
}
