import { PersistenceError } from '../lib/errors.js';
import { getSupabase } from '../lib/supabase.js';
import type { PaymentEvent } from '../payments/payment.service.js';

export async function createPendingPayment(input: { userId: string; checkoutId: string; clientReferenceId: string; providerPlanId: string; packId: string; currency: string; amount: number; credits: number }): Promise<void> {
  const { error } = await getSupabase().from('payment_transactions').upsert({ user_id: input.userId, provider: 'whop', provider_checkout_id: input.checkoutId, client_reference_id: input.clientReferenceId, provider_plan_id: input.providerPlanId, pack_id: input.packId, currency: input.currency, amount: input.amount, credits_purchased: input.credits, status: 'PENDING' }, { onConflict: 'provider_checkout_id', ignoreDuplicates: true });
  if (error) throw new PersistenceError('The checkout record could not be saved.');
}

export async function completePurchase(event: Extract<PaymentEvent, { type: 'PURCHASE_COMPLETED' }> & { expectedAmount: number }): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('complete_credit_purchase_v3', { p_provider: event.provider, p_event_id: event.id, p_user_id: event.userId, p_checkout_id: event.checkoutId, p_client_reference_id: event.clientReferenceId, p_payment_id: event.paymentId, p_plan_id: event.planId, p_pack_id: event.packId, p_currency: event.currency, p_expected_amount: event.expectedAmount, p_paid_amount: event.amountPaid, p_credits: event.credits, p_metadata: { subtotal: event.subtotal, tax_amount: event.taxAmount } });
  if (error || typeof data !== 'boolean') throw new PersistenceError('The verified purchase could not be applied.');
  return data;
}

export async function failPayment(eventId: string, checkoutId: string): Promise<void> {
  const { error } = await getSupabase().rpc('record_payment_failure_v2', { p_provider: 'whop', p_event_id: eventId, p_checkout_id: checkoutId });
  if (error) throw new PersistenceError('The failed payment could not be recorded.');
}

export async function refundPayment(event: Extract<PaymentEvent, { type: 'PAYMENT_REFUNDED' }>): Promise<'PARTIAL' | 'REVERSED' | 'REVIEW_REQUIRED' | 'DUPLICATE'> {
  const { data, error } = await getSupabase().rpc('refund_credit_purchase_v3', { p_provider: 'whop', p_event_id: event.id, p_refund_id: event.refundId, p_payment_id: event.paymentId, p_plan_id: event.planId, p_currency: event.currency, p_refund_amount: event.amount });
  if (error || !['PARTIAL', 'REVERSED', 'REVIEW_REQUIRED', 'DUPLICATE'].includes(String(data))) throw new PersistenceError('The refund could not be recorded.');
  return data as 'PARTIAL' | 'REVERSED' | 'REVIEW_REQUIRED' | 'DUPLICATE';
}

export async function checkoutStatus(userId: string, checkoutId: string) {
  const column = checkoutId.startsWith('ch_') ? 'provider_checkout_id' : 'client_reference_id';
  const { data, error } = await getSupabase().from('payment_transactions').select('provider_checkout_id,pack_id,credits_purchased,status').eq('user_id', userId).eq(column, checkoutId).maybeSingle();
  if (error) throw new PersistenceError('Checkout status could not be loaded.');
  return data;
}
