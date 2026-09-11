import { NotFoundError } from '../lib/errors.js';
import * as feedbackRepository from '../repositories/feedback.repository.js';
import * as reportRepository from '../repositories/report.repository.js';
import { FeedbackOutcome, FeedbackSummary } from '../types/verify.types.js';

async function ensureReportExists(reportId: string): Promise<void> {
  if (!await reportRepository.findReportById(reportId)) throw new NotFoundError('Report not found.');
}

export async function submitFeedback(reportId: string, outcome: FeedbackOutcome, comment?: string): Promise<void> {
  await ensureReportExists(reportId);
  await feedbackRepository.createFeedback(reportId, outcome, comment);
}

export async function loadFeedbackSummary(reportId: string): Promise<FeedbackSummary> {
  await ensureReportExists(reportId);
  return feedbackRepository.getFeedbackSummary(reportId);
}
