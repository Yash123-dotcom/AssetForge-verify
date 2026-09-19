import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaymentEvent } from '../payments/payment.service.js';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('../lib/supabase.js', () => ({ getSupabase: () => ({ rpc }) }));
const { completePurchase } = await import('./payment.repository.js');
const event: Extract<PaymentEvent, { type: 'PURCHASE_COMPLETED' }> = { id: 'evt-1', type: 'PURCHASE_COMPLETED', provider: 'whop', userId: 'user-1', checkoutId: 'checkout-1', clientReferenceId: '64a135e6-92ea-4876-8f1c-ea4b84654560', paymentId: 'payment-1', packId: 'DEEP_SCAN_5', currency: 'INR', amount: 49900, credits: 5 };

beforeEach(() => rpc.mockReset());

describe('payment webhook persistence boundary', () => {
  it('reports duplicate webhook delivery without granting twice', async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: false, error: null });
    await expect(completePurchase(event)).resolves.toBe(true);
    await expect(completePurchase(event)).resolves.toBe(false);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenCalledWith('complete_credit_purchase_v2', expect.objectContaining({ p_provider: 'whop', p_event_id: 'evt-1', p_credits: 5 }));
  });
});
