import { PersistenceError } from '../lib/errors.js';
import { getSupabase } from '../lib/supabase.js';
import { CheckResult, FeedbackOutcome, PredictionAlignment, Risk } from '../types/verify.types.js';

type EventRow = { event_name: string };
type MetricsReportRow = { id: string; score: number; risk: Risk; checks: CheckResult[]; project_unity_version: string; project_pipeline: string; project_platform: string; asset_unity_version: string; asset_pipeline: string; custom_shaders: boolean; dependencies: string[] };
type FeedbackRow = { report_id: string; outcome: FeedbackOutcome; prediction_alignment: PredictionAlignment };
type PaymentMetricRow = { user_id: string; credits_purchased: number; status: string };
type CreditMetricRow = { user_id: string; type: string; amount: number };

export async function createBetaEvent(event: string, durationMs?: number, isDemo = false): Promise<void> {
  const { error } = await getSupabase().from('beta_events').insert({ event_name: event, duration_ms: durationMs ?? null, is_demo: isDemo });
  if (error) throw new PersistenceError('The analytics event could not be recorded.');
}

export async function loadMetricsData(): Promise<{ events: EventRow[]; reports: MetricsReportRow[]; feedback: FeedbackRow[]; usefulnessCount: number; payments: PaymentMetricRow[]; creditTransactions: CreditMetricRow[] }> {
  const client = getSupabase();
  const [eventsResult, reportsResult, feedbackResult, usefulnessResult, paymentsResult, creditsResult] = await Promise.all([
    client.from('beta_events').select('event_name').eq('is_demo', false).returns<EventRow[]>(),
    client.from('verification_reports').select('id,score,risk,checks,project_unity_version,project_pipeline,project_platform,asset_unity_version,asset_pipeline,custom_shaders,dependencies').eq('is_demo', false).returns<MetricsReportRow[]>(),
    client.from('report_feedback').select('report_id,outcome,prediction_alignment').returns<FeedbackRow[]>(),
    client.from('report_usefulness').select('*', { count: 'exact', head: true }),
    client.from('payment_transactions').select('user_id,credits_purchased,status').returns<PaymentMetricRow[]>(),
    client.from('credit_transactions').select('user_id,type,amount').returns<CreditMetricRow[]>(),
  ]);
  if (eventsResult.error || reportsResult.error || feedbackResult.error || usefulnessResult.error || paymentsResult.error || creditsResult.error) throw new PersistenceError('Beta metrics could not be loaded.');
  return { events: eventsResult.data ?? [], reports: reportsResult.data ?? [], feedback: feedbackResult.data ?? [], usefulnessCount: usefulnessResult.count ?? 0, payments: paymentsResult.data ?? [], creditTransactions: creditsResult.data ?? [] };
}
