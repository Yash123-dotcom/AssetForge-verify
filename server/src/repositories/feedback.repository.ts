import { PersistenceError } from '../lib/errors.js';
import { getSupabase } from '../lib/supabase.js';
import { FeedbackCategory, FeedbackOutcome, FeedbackSummary, PredictionAlignment } from '../types/verify.types.js';

type OutcomeRow = { outcome: FeedbackOutcome };

export async function createFeedback(reportId: string, outcome: FeedbackOutcome, category: FeedbackCategory | undefined, comment: string | undefined, alignment: PredictionAlignment): Promise<void> {
  const { error } = await getSupabase().from('report_feedback').insert({ report_id: reportId, outcome, feedback_category: category ?? null, comment: comment || null, prediction_alignment: alignment });
  if (error) throw new PersistenceError('The feedback could not be saved.');
}

export async function getFeedbackSummary(reportId: string): Promise<FeedbackSummary> {
  const { data, error } = await getSupabase().from('report_feedback').select('outcome').eq('report_id', reportId).returns<OutcomeRow[]>();
  if (error) throw new PersistenceError('Community feedback could not be loaded.');
  return (data ?? []).reduce<FeedbackSummary>((summary, row) => {
    summary.totalResponses += 1;
    if (row.outcome === 'WORKED') summary.worked += 1;
    if (row.outcome === 'PARTIAL') summary.partial += 1;
    if (row.outcome === 'FAILED') summary.failed += 1;
    return summary;
  }, { totalResponses: 0, worked: 0, partial: 0, failed: 0 });
}
