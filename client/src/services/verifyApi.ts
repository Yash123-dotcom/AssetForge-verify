import type { AssetListingAnalysis, FeedbackCategory, FeedbackOutcome, FeedbackSummary, UsefulnessRating, VerificationReport, VerifyRequest } from '../types/verify.types';

const API_URL = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:4000' : '')).replace(/\/$/, '');

function endpoint(path: string): string {
  if (!API_URL) throw new Error('AssetForge Verify API is not configured. Add VITE_API_URL to the deployment environment.');
  return `${API_URL}${path}`;
}

const friendlyErrors: Record<string, string> = {
  INVALID_ASSET_URL: 'Paste a valid Unity Asset Store listing URL.',
  UNSUPPORTED_DOMAIN: 'Only public Unity Asset Store listing URLs can be analyzed.',
  ASSET_FETCH_TIMEOUT: 'The listing took too long to respond. Retry the analysis or enter details manually.',
  ASSET_PARSE_FAILED: "We couldn't read enough data from this listing.",
  REPORT_NOT_FOUND: "This report isn't available.",
  FEEDBACK_INVALID: 'Check the feedback details and try again.',
  INTERNAL_ERROR: 'The service hit an unexpected error. Please try again.',
};

export class ApiError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}

async function responseError(response: Response, fallback: string): Promise<ApiError> {
  const body = await response.json().catch(() => null) as { code?: string; error?: string } | null;
  const code = body?.code ?? 'INTERNAL_ERROR';
  return new ApiError(code, friendlyErrors[code] ?? body?.error ?? fallback);
}

export async function verifyAsset(input: VerifyRequest): Promise<VerificationReport> {
  const response = await fetch(endpoint('/api/verify'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  if (!response.ok) {
    throw await responseError(response, 'Could not verify this asset. Please try again.');
  }
  return response.json() as Promise<VerificationReport>;
}

export async function getReport(id: string): Promise<VerificationReport> {
  const response = await fetch(endpoint(`/api/reports/${encodeURIComponent(id)}`));
  if (!response.ok) throw await responseError(response, 'Could not load this report.');
  return response.json() as Promise<VerificationReport>;
}

export async function getFeedbackSummary(id: string): Promise<FeedbackSummary> {
  const response = await fetch(endpoint(`/api/reports/${encodeURIComponent(id)}/feedback-summary`));
  if (!response.ok) throw await responseError(response, 'Could not load community feedback.');
  return response.json() as Promise<FeedbackSummary>;
}

export async function sendFeedback(id: string, outcome: FeedbackOutcome, category: FeedbackCategory | undefined, comment: string): Promise<void> {
  const response = await fetch(endpoint(`/api/reports/${encodeURIComponent(id)}/feedback`), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcome, category, comment: comment.trim() || undefined }),
  });
  if (!response.ok) throw await responseError(response, 'Could not send your feedback.');
}

export async function sendUsefulness(id: string, rating: UsefulnessRating, comment: string): Promise<void> {
  const response = await fetch(endpoint(`/api/reports/${encodeURIComponent(id)}/usefulness`), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
  });
  if (!response.ok) throw await responseError(response, 'Could not send your usefulness rating.');
}

export async function analyzeAssetUrl(url: string): Promise<AssetListingAnalysis> {
  const response = await fetch(endpoint('/api/assets/analyze'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
  if (!response.ok) throw await responseError(response, "We couldn't analyze this listing.");
  const body = await response.json() as { analysis: AssetListingAnalysis };
  return body.analysis;
}
