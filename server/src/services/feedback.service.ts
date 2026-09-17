import { NotFoundError } from '../lib/errors.js';
import * as feedbackRepository from '../repositories/feedback.repository.js';
import * as reportRepository from '../repositories/report.repository.js';
import { FeedbackCategory, FeedbackOutcome, FeedbackSummary } from '../types/verify.types.js';
import { calculatePredictionAlignment } from './alignment.service.js';

async function ensureReportExists(reportId: string): Promise<void> {
  if (!await reportRepository.findReportById(reportId)) throw new NotFoundError('Report not found.');
}

export async function submitFeedback(reportId: string, outcome: FeedbackOutcome, category?: FeedbackCategory, comment?: string): Promise<void> {
  const report = await reportRepository.findReportById(reportId);
  if (!report) throw new NotFoundError('Report not found.');
  await feedbackRepository.createFeedback(reportId, outcome, category, comment, calculatePredictionAlignment(report.risk, outcome));
}

export async function loadFeedbackSummary(reportId: string): Promise<FeedbackSummary> {
  await ensureReportExists(reportId);
  return feedbackRepository.getFeedbackSummary(reportId);
}
