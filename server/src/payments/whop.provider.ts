import { WhopClient } from '@whop/sdk';
import { unwrapWebhook } from '@whop/sdk/helpers';
import { z } from 'zod';
import { ServiceError } from '../lib/errors.js';
import type { CheckoutRequest, CheckoutResult, PaymentEvent, PaymentService, WebhookHeaders } from './payment.service.js';

let whop: WhopClient | undefined;

function configuredBaseUrl(): string {
  const value = (process.env.WHOP_API_BASE_URL ?? 'https://api.whop.com/api/v1').replace(/\/$/, '');
  const allowed = new Set(['https://api.whop.com/api/v1', 'https://sandbox-api.whop.com/api/v1']);
  if (!allowed.has(value)) throw new ServiceError('PAYMENT_NOT_CONFIGURED', 'The Whop API URL is not allowed.', 503);
  return value;
}

export function validatedCheckoutUrl(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new ServiceError('CHECKOUT_FAILED', 'Whop returned an invalid checkout URL.', 502); }
  const allowedHosts = new Set(['whop.com', 'www.whop.com', 'checkout.whop.com', 'sandbox.whop.com']);
  if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname) || url.username || url.password || url.port) {
    throw new ServiceError('CHECKOUT_FAILED', 'Whop returned an untrusted checkout URL.', 502);
  }
  return url.href;
}

function client(): WhopClient {
  const token = process.env.WHOP_API_KEY;
  if (!token) throw new ServiceError('PAYMENT_NOT_CONFIGURED', 'Whop checkout is not configured.', 503);
  whop ??= new WhopClient({
    token,
    apiVersionDate: process.env.WHOP_API_VERSION_DATE ?? '2026-09-15',
    baseUrl: configuredBaseUrl(),
  });
  return whop;
}

const metadataSchema = z.object({
  integration: z.literal('assetforge_verify'),
  user_id: z.string().uuid(),
  client_reference_id: z.string().uuid(),
  pack_id: z.string().min(1),
  credits: z.coerce.number().int().positive(),
  currency: z.string().toUpperCase().pipe(z.enum(['INR', 'USD'])),
}).passthrough();

const moneySchema = z.union([
  z.number().nonnegative().transform((amount) => Math.round(amount * 100)),
  z.object({ amount: z.string().regex(/^\d+(?:\.\d+)?$/), decimals: z.number().int().min(0).max(6) }).transform((money) => {
    const [whole, fraction = ''] = money.amount.split('.');
    const normalizedFraction = `${fraction}${'0'.repeat(money.decimals)}`.slice(0, money.decimals);
    const result = Number(whole) * (10 ** money.decimals) + Number(normalizedFraction || 0);
    if (!Number.isSafeInteger(result) || result < 0) throw new Error('Invalid money amount');
    return result;
  }),
]);

const paymentEventSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['payment.succeeded', 'payment.failed']),
  company_id: z.string().min(1),
  data: z.object({
    id: z.string().min(1),
    checkout_configuration_id: z.string().min(1).nullable(),
    currency: z.string(),
    subtotal: moneySchema,
    tax_amount: moneySchema.nullable(),
    total: moneySchema,
    plan: z.object({ id: z.string().min(1) }).passthrough(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
  }).passthrough(),
}).passthrough();

const refundEventSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['refund.created', 'refund.updated']),
  company_id: z.string().min(1),
  data: z.object({
    id: z.string().min(1),
    amount: moneySchema,
    currency: z.string(),
    status: z.string(),
    payment: z.object({ id: z.string().min(1), plan: z.object({ id: z.string().min(1) }).passthrough() }).passthrough(),
  }).passthrough(),
}).passthrough();

export class WhopPaymentService implements PaymentService {
  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const accountId = process.env.WHOP_COMPANY_ID;
    if (!accountId) throw new ServiceError('PAYMENT_NOT_CONFIGURED', 'The Whop company ID is not configured.', 503);
    const checkout = await client().checkoutConfigurations.create({
      account_id: accountId,
      plan_id: request.planId,
      mode: 'payment',
      redirect_url: `${request.successUrl}?session_id=${encodeURIComponent(request.idempotencyKey)}`,
      metadata: {
        integration: 'assetforge_verify',
        user_id: request.userId,
        client_reference_id: request.idempotencyKey,
        customer_email: request.email,
        pack_id: request.packId,
        credits: String(request.credits),
        currency: request.currency,
      },
    }, { idempotencyKey: `assetforge:${request.userId}:${request.idempotencyKey}` });
    if (!checkout.purchase_url) throw new ServiceError('CHECKOUT_FAILED', 'Whop did not return a checkout URL.', 502);
    return { checkoutId: checkout.id, url: validatedCheckoutUrl(checkout.purchase_url), paymentStatus: 'pending' };
  }

  verifyWebhook(payload: Buffer, headers: WebhookHeaders): PaymentEvent | null {
    const secret = process.env.WHOP_WEBHOOK_SECRET;
    if (!secret) throw new ServiceError('PAYMENT_NOT_CONFIGURED', 'Whop webhook verification is not configured.', 503);
    let rawEvent: unknown;
    try {
      rawEvent = unwrapWebhook(payload.toString('utf8'), {
        key: secret,
        headers: { 'webhook-id': headers.id, 'webhook-timestamp': headers.timestamp, 'webhook-signature': headers.signature },
      });
    } catch {
      throw new ServiceError('INVALID_WEBHOOK_SIGNATURE', 'Invalid payment webhook signature.', 400);
    }

    const eventType = z.object({ type: z.string() }).safeParse(rawEvent);
    if (!eventType.success) throw new ServiceError('INVALID_PAYMENT_EVENT', 'Payment webhook payload is invalid.', 400);
    if (eventType.data.type === 'payment.succeeded' || eventType.data.type === 'payment.failed') {
      const parsed = paymentEventSchema.safeParse(rawEvent);
      if (!parsed.success) throw new ServiceError('INVALID_PAYMENT_EVENT', 'Payment webhook payload is invalid.', 400);
      if (parsed.data.company_id !== process.env.WHOP_COMPANY_ID) throw new ServiceError('INVALID_PAYMENT_EVENT', 'Payment webhook company does not match.', 400);
      const metadata = metadataSchema.safeParse(parsed.data.data.metadata);
      if (!metadata.success || !parsed.data.data.checkout_configuration_id) return null;
      if (parsed.data.type === 'payment.failed') return { id: parsed.data.id, type: 'PURCHASE_FAILED', checkoutId: parsed.data.data.checkout_configuration_id };
      const currency = parsed.data.data.currency.toUpperCase();
      if (currency !== metadata.data.currency || (currency !== 'USD' && currency !== 'INR')) throw new ServiceError('INVALID_PAYMENT_EVENT', 'Payment currency does not match checkout metadata.', 400);
      return {
        id: parsed.data.id,
        type: 'PURCHASE_COMPLETED',
        provider: 'whop',
        userId: metadata.data.user_id,
        checkoutId: parsed.data.data.checkout_configuration_id,
        clientReferenceId: metadata.data.client_reference_id,
        paymentId: parsed.data.data.id,
        planId: parsed.data.data.plan.id,
        packId: metadata.data.pack_id,
        currency,
        subtotal: parsed.data.data.subtotal,
        taxAmount: parsed.data.data.tax_amount ?? 0,
        amountPaid: parsed.data.data.total,
        credits: metadata.data.credits,
      };
    }
    if (eventType.data.type === 'refund.created' || eventType.data.type === 'refund.updated') {
      const parsed = refundEventSchema.safeParse(rawEvent);
      if (!parsed.success) throw new ServiceError('INVALID_PAYMENT_EVENT', 'Payment webhook payload is invalid.', 400);
      if (parsed.data.company_id !== process.env.WHOP_COMPANY_ID) throw new ServiceError('INVALID_PAYMENT_EVENT', 'Refund webhook company does not match.', 400);
      const currency = parsed.data.data.currency.toUpperCase();
      if (currency !== 'USD' && currency !== 'INR') throw new ServiceError('INVALID_PAYMENT_EVENT', 'Refund currency is unsupported.', 400);
      return parsed.data.data.status === 'succeeded'
        ? { id: parsed.data.id, type: 'PAYMENT_REFUNDED', refundId: parsed.data.data.id, paymentId: parsed.data.data.payment.id, planId: parsed.data.data.payment.plan.id, currency, amount: parsed.data.data.amount }
        : null;
    }
    return null;
  }
}

export function getPaymentService(): PaymentService {
  const provider = (process.env.PAYMENT_PROVIDER ?? 'whop').toLowerCase();
  if (provider !== 'whop') throw new ServiceError('PAYMENT_PROVIDER_UNSUPPORTED', 'The configured payment provider is not supported.', 503);
  return new WhopPaymentService();
}
