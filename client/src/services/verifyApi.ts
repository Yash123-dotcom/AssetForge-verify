import type { AssetListingAnalysis, FeedbackOutcome, FeedbackSummary, VerificationReport, VerifyRequest } from '../types/verify.types';

const API_URL = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:4000' : '')).replace(/\/$/, '');

function endpoint(path: string): string {
  if (!API_URL) throw new Error('AssetForge Verify API is not configured. Add VITE_API_URL to the deployment environment.');
  return `${API_URL}${path}`;
}

async function responseError(response: Response, fallback: string): Promise<Error> {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return new Error(body?.error ?? fallback);
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

export async function sendFeedback(id: string, outcome: FeedbackOutcome, comment: string): Promise<void> {
  const response = await fetch(endpoint(`/api/reports/${encodeURIComponent(id)}/feedback`), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcome, comment: comment.trim() || undefined }),
  });
  if (!response.ok) throw await responseError(response, 'Could not send your feedback.');
}

export async function analyzeAssetUrl(url: string): Promise<AssetListingAnalysis> {
  const response = await fetch(endpoint('/api/assets/analyze'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
  if (!response.ok) throw await responseError(response, "We couldn't analyze this listing.");
  const body = await response.json() as { analysis: AssetListingAnalysis };
  return body.analysis;
}
