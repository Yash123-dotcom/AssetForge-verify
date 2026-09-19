import { PersistenceError } from '../lib/errors.js';
import { getSupabase } from '../lib/supabase.js';
import type { PaymentEvent } from '../payments/payment.service.js';

export async function createPendingPayment(input: { userId: string; checkoutId: string; clientReferenceId: string; packId: string; currency: string; amount: number; credits: number }): Promise<void> {
  const { error } = await getSupabase().from('payment_transactions').upsert({ user_id: input.userId, provider: 'whop', provider_checkout_id: input.checkoutId, client_reference_id: input.clientReferenceId, pack_id: input.packId, currency: input.currency, amount: input.amount, credits_purchased: input.credits, status: 'PENDING' }, { onConflict: 'provider_checkout_id', ignoreDuplicates: true });
  if (error) throw new PersistenceError('The checkout record could not be saved.');
}

export async function completePurchase(event: Extract<PaymentEvent, { type: 'PURCHASE_COMPLETED' }>): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('complete_credit_purchase_v2', { p_provider: event.provider, p_event_id: event.id, p_user_id: event.userId, p_checkout_id: event.checkoutId, p_client_reference_id: event.clientReferenceId, p_payment_id: event.paymentId, p_pack_id: event.packId, p_currency: event.currency, p_amount: event.amount, p_credits: event.credits, p_metadata: {} });
  if (error || typeof data !== 'boolean') throw new PersistenceError('The verified purchase could not be applied.');
  return data;
}

export async function failPayment(eventId: string, checkoutId: string): Promise<void> {
  const { error } = await getSupabase().rpc('record_payment_failure_v2', { p_provider: 'whop', p_event_id: eventId, p_checkout_id: checkoutId });
  if (error) throw new PersistenceError('The failed payment could not be recorded.');
}

export async function refundPayment(eventId: string, paymentId: string): Promise<void> {
  const { error } = await getSupabase().rpc('refund_credit_purchase_v2', { p_provider: 'whop', p_event_id: eventId, p_payment_id: paymentId });
  if (error) throw new PersistenceError('The refund could not be recorded.');
}

export async function checkoutStatus(userId: string, checkoutId: string) {
  const column = checkoutId.startsWith('ch_') ? 'provider_checkout_id' : 'client_reference_id';
  const { data, error } = await getSupabase().from('payment_transactions').select('provider_checkout_id,pack_id,credits_purchased,status').eq('user_id', userId).eq(column, checkoutId).maybeSingle();
  if (error) throw new PersistenceError('Checkout status could not be loaded.');
  return data;
}
