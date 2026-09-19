import type { Currency, CreditPackId } from './pricing.config.js';

export type WebhookHeaders = { id: string; timestamp: string; signature: string };
export type CheckoutRequest = { userId: string; email: string; packId: CreditPackId; credits: number; currency: Currency; planId: string; successUrl: string; cancelUrl: string; idempotencyKey: string };
export type CheckoutResult = { checkoutId: string; url: string; paymentStatus: string };
export type PaymentEvent =
  | { id: string; type: 'PURCHASE_COMPLETED'; provider: 'whop'; userId: string; checkoutId: string; clientReferenceId: string; paymentId: string; packId: string; currency: Currency; amount: number; credits: number }
  | { id: string; type: 'PURCHASE_FAILED'; checkoutId: string }
  | { id: string; type: 'PAYMENT_REFUNDED'; paymentId: string; packId: string; currency: Currency; amount: number };

export interface PaymentService {
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
  verifyWebhook(payload: Buffer, headers: WebhookHeaders): PaymentEvent | null;
}
