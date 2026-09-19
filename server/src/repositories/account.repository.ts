import { PersistenceError, ServiceError } from '../lib/errors.js';
import { getSupabase } from '../lib/supabase.js';

export type CreditBalance = { availableCredits: number; reservedCredits: number; updatedAt: string };
export type AccountActivity = { id: string; name: string; createdAt: string; score: number; risk: string; scanType: 'QUICK_CHECK' | 'DEEP_SCAN'; status: 'COMPLETED' };

export async function getCreditBalance(userId: string): Promise<CreditBalance> {
  const { data, error } = await getSupabase().from('credit_balances').select('available_credits,reserved_credits,updated_at').eq('user_id', userId).maybeSingle<{ available_credits: number; reserved_credits: number; updated_at: string }>();
  if (error) throw new PersistenceError('Credit balance could not be loaded.');
  return { availableCredits: data?.available_credits ?? 0, reservedCredits: data?.reserved_credits ?? 0, updatedAt: data?.updated_at ?? new Date().toISOString() };
}

export async function reserveCredit(userId: string, idempotencyKey: string): Promise<{ reservationId: string; availableCredits: number; status: string }> {
  const { data, error } = await getSupabase().rpc('reserve_deep_scan_credit', { p_user_id: userId, p_idempotency_key: idempotencyKey });
  if (error) {
    if (error.message.includes('INSUFFICIENT_CREDITS')) throw new ServiceError('INSUFFICIENT_CREDITS', 'You need one Deep Scan credit to continue.', 402);
    throw new PersistenceError('A Deep Scan credit could not be reserved.');
  }
  const row = (data as Array<{ reservation_id: string; reservation_status: string; available_credits: number; reservation_created: boolean }> | null)?.[0];
  if (!row) throw new PersistenceError('A Deep Scan credit could not be reserved.');
  if (row.reservation_status === 'CONSUMED') throw new ServiceError('SCAN_ALREADY_COMPLETED', 'This Deep Scan request has already been completed.', 409);
  if (!row.reservation_created) throw new ServiceError('SCAN_ALREADY_IN_PROGRESS', 'This Deep Scan request is already in progress.', 409);
  return { reservationId: row.reservation_id, status: row.reservation_status, availableCredits: row.available_credits };
}

export async function finalizeCredit(userId: string, reservationId: string, reportId: string): Promise<number> {
  const { data, error } = await getSupabase().rpc('finalize_deep_scan_credit', { p_user_id: userId, p_reservation_id: reservationId, p_report_id: reportId });
  if (error || typeof data !== 'number') throw new PersistenceError('Deep Scan credit usage could not be finalized.');
  return data;
}

export async function releaseCredit(userId: string, reservationId: string, reason: string): Promise<number> {
  const { data, error } = await getSupabase().rpc('release_deep_scan_credit', { p_user_id: userId, p_reservation_id: reservationId, p_reason: reason.slice(0, 120) });
  if (error || typeof data !== 'number') throw new PersistenceError('The reserved Deep Scan credit could not be released.');
  return data;
}

export async function releaseStaleReservations(maxAgeMs = 15 * 60 * 1000): Promise<number> {
  const { data, error } = await getSupabase().rpc('release_stale_deep_scan_credits', { p_stale_before: new Date(Date.now() - maxAgeMs).toISOString() });
  if (error || typeof data !== 'number') throw new PersistenceError('Stale credit reservations could not be released.');
  return data;
}

export async function getAccountData(userId: string) {
  const client = getSupabase();
  const [profile, balance, reports, payments, credits] = await Promise.all([
    client.from('profiles').select('email,display_name,created_at').eq('id', userId).single(),
    getCreditBalance(userId),
    client.from('verification_reports').select('id,asset_name,created_at,score,risk,asset_source').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
    client.from('payment_transactions').select('id,pack_id,currency,amount,credits_purchased,status,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
    client.from('credit_transactions').select('id,type,amount,metadata,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
  ]);
  if (profile.error || reports.error || payments.error || credits.error) throw new PersistenceError('Account data could not be loaded.');
  const activity: AccountActivity[] = (reports.data ?? []).map((report) => ({ id: report.id, name: report.asset_name ?? 'Unity asset', createdAt: report.created_at, score: report.score, risk: report.risk, scanType: report.asset_source === 'UPLOADED_PACKAGE' ? 'DEEP_SCAN' : 'QUICK_CHECK', status: 'COMPLETED' }));
  return { profile: { email: profile.data.email, displayName: profile.data.display_name, createdAt: profile.data.created_at }, balance, activity, payments: payments.data ?? [], creditTransactions: credits.data ?? [], totals: { reports: activity.length, deepScans: activity.filter((item) => item.scanType === 'DEEP_SCAN').length } };
}

export async function grantCredits(userId: string, amount: number, reason: string): Promise<number> {
  const { data, error } = await getSupabase().rpc('grant_assetforge_credits', { p_user_id: userId, p_amount: amount, p_reason: reason });
  if (error || typeof data !== 'number') throw new PersistenceError('Credits could not be granted.');
  return data;
}
