import { NotFoundError } from '../lib/errors.js';
import * as reportRepository from '../repositories/report.repository.js';
import { VerificationReport, VerifyRequest } from '../types/verify.types.js';
import { verifyCompatibility } from './verification.service.js';

export async function analyzeAndSaveReport(input: VerifyRequest, userId?: string): Promise<VerificationReport> {
  return reportRepository.createReport(input, verifyCompatibility(input), userId);
}

export async function getReport(id: string): Promise<VerificationReport> {
  const report = await reportRepository.findReportById(id);
  if (!report) throw new NotFoundError('Report not found.');
  return report;
}
