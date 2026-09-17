import { NotFoundError } from '../lib/errors.js';
import * as reportRepository from '../repositories/report.repository.js';
import * as usefulnessRepository from '../repositories/usefulness.repository.js';
import { UsefulnessRating } from '../types/verify.types.js';

export async function submitUsefulness(reportId: string, rating: UsefulnessRating, comment?: string): Promise<void> {
  if (!await reportRepository.findReportById(reportId)) throw new NotFoundError('Report not found.');
  await usefulnessRepository.createUsefulness(reportId, rating, comment);
}
