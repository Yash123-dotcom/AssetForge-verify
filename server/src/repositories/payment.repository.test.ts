import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaymentEvent } from '../payments/payment.service.js';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('../lib/supabase.js', () => ({ getSupabase: () => ({ rpc }) }));
const { completePurchase, refundPayment } = await import('./payment.repository.js');
const event: Extract<PaymentEvent, { type: 'PURCHASE_COMPLETED' }> & { expectedAmount: number } = { id: 'evt-1', type: 'PURCHASE_COMPLETED', provider: 'whop', userId: 'user-1', checkoutId: 'checkout-1', clientReferenceId: '64a135e6-92ea-4876-8f1c-ea4b84654560', paymentId: 'payment-1', planId: 'plan-1', packId: 'DEEP_SCAN_5', currency: 'USD', subtotal: 699, taxAmount: 100, amountPaid: 799, expectedAmount: 799, credits: 5 };

beforeEach(() => rpc.mockReset());

describe('payment webhook persistence boundary', () => {
  it('reports duplicate webhook delivery without granting twice', async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: false, error: null });
    await expect(completePurchase(event)).resolves.toBe(true);
    await expect(completePurchase(event)).resolves.toBe(false);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenCalledWith('complete_credit_purchase_v3', expect.objectContaining({ p_provider: 'whop', p_event_id: 'evt-1', p_plan_id: 'plan-1', p_expected_amount: 799, p_paid_amount: 799, p_credits: 5 }));
  });

  it('passes the provider refund ID and exposes partial-refund outcomes', async () => {
    rpc.mockResolvedValueOnce({ data: 'PARTIAL', error: null });
    const outcome = await refundPayment({ id: 'evt-refund', type: 'PAYMENT_REFUNDED', refundId: 'rf-1', paymentId: 'payment-1', planId: 'plan-1', currency: 'USD', amount: 200 });
    expect(outcome).toBe('PARTIAL');
    expect(rpc).toHaveBeenCalledWith('refund_credit_purchase_v3', expect.objectContaining({ p_event_id: 'evt-refund', p_refund_id: 'rf-1', p_payment_id: 'payment-1', p_refund_amount: 200 }));
  });
});
