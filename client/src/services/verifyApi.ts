import type { AccountData, AssetListingAnalysis, CreditPack, DeepScanResponse, FeedbackCategory, FeedbackOutcome, FeedbackSummary, UsefulnessRating, VerificationReport, VerifyRequest } from '../types/verify.types';
import { accessToken } from './supabase';

const API_URL = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:4000' : '')).replace(/\/$/, '');
const DEEP_SCAN_API_URL = (import.meta.env.VITE_DEEP_SCAN_API_URL || API_URL).replace(/\/$/, '');

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
  PACKAGE_TOO_LARGE: 'This package is larger than the current Deep Scan limit.',
  PACKAGE_EMPTY: 'Choose a non-empty Unity package.',
  INVALID_PACKAGE_TYPE: 'Choose a valid .unitypackage file.',
  ARCHIVE_UNSAFE: 'This package could not be scanned because its archive structure is unsafe.',
  ARCHIVE_TOO_LARGE: 'The extracted package exceeds the current Deep Scan limit.',
  ARCHIVE_TOO_MANY_FILES: 'This package contains more files than Deep Scan can safely inspect.',
  ARCHIVE_EXTRACTION_FAILED: 'The package archive could not be read.',
  SCAN_TIMEOUT: 'Deep Scan took too long to complete. Try a smaller package or use Quick Check.',
  DEEP_SCAN_RUNTIME_UNAVAILABLE: 'Deep Scan is not available on the current API runtime.',
  AUTH_REQUIRED: 'Sign in to use paid Deep Scan.',
  AUTH_SESSION_INVALID: 'Your session expired. Sign in again.',
  INSUFFICIENT_CREDITS: 'You need one Deep Scan credit to continue.',
  PAYMENT_NOT_CONFIGURED: 'Checkout is not available yet for this pack and currency.',
};

export class ApiError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}

async function authHeaders(json = false): Promise<Record<string, string>> {
  const token = await accessToken();
  return { ...(json ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function responseError(response: Response, fallback: string): Promise<ApiError> {
  const body = await response.json().catch(() => null) as { code?: string; error?: string } | null;
  const code = body?.code ?? 'INTERNAL_ERROR';
  return new ApiError(code, friendlyErrors[code] ?? body?.error ?? fallback);
}

export async function verifyAsset(input: VerifyRequest): Promise<VerificationReport> {
  const response = await fetch(endpoint('/api/verify'), { method: 'POST', headers: await authHeaders(true), body: JSON.stringify(input) });
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

export async function deepScanPackage(file: File, project: VerifyRequest['project'], idempotencyKey: string, onUploadProgress: (ratio: number) => void): Promise<DeepScanResponse> {
  if (!DEEP_SCAN_API_URL) return Promise.reject(new ApiError('DEEP_SCAN_RUNTIME_UNAVAILABLE', friendlyErrors.DEEP_SCAN_RUNTIME_UNAVAILABLE));
  const token = await accessToken();
  if (!token) return Promise.reject(new ApiError('AUTH_REQUIRED', friendlyErrors.AUTH_REQUIRED));
  const body = new FormData(); body.append('file', file); body.append('projectUnityVersion', project.unityVersion); body.append('projectPipeline', project.pipeline); body.append('projectPlatform', project.platform); body.append('idempotencyKey', idempotencyKey);
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest(); request.open('POST', `${DEEP_SCAN_API_URL}/api/deep-scan`); request.responseType = 'json';
    request.setRequestHeader('Authorization', `Bearer ${token}`);
    request.upload.onprogress = (event) => { if (event.lengthComputable) onUploadProgress(event.loaded / event.total); };
    request.onerror = () => reject(new ApiError('NETWORK_ERROR', 'Deep Scan could not reach the package-processing service.'));
    request.onload = () => {
      const response = request.response as (DeepScanResponse & { code?: string; error?: string }) | null;
      if (request.status >= 200 && request.status < 300 && response) resolve(response);
      else { const code = response?.code ?? 'INTERNAL_ERROR'; reject(new ApiError(code, friendlyErrors[code] ?? response?.error ?? 'Deep Scan could not inspect this package.')); }
    };
    request.send(body);
  });
}

export async function getPricing(): Promise<{ packs: CreditPack[]; defaultCurrency: 'USD'; creditsExpire: boolean }> {
  const response = await fetch(endpoint('/api/payments/pricing'));
  if (!response.ok) throw await responseError(response, 'Pricing could not be loaded.');
  return response.json();
}

export async function createCheckout(packId: CreditPack['id'], currency: 'USD'): Promise<{ checkoutId: string; url: string }> {
  const response = await fetch(endpoint('/api/payments/checkout'), { method: 'POST', headers: await authHeaders(true), body: JSON.stringify({ packId, currency, idempotencyKey: crypto.randomUUID() }) });
  if (!response.ok) throw await responseError(response, 'Checkout could not be started.');
  return response.json();
}

export async function getAccount(): Promise<AccountData> {
  const response = await fetch(endpoint('/api/account'), { headers: await authHeaders() });
  if (!response.ok) throw await responseError(response, 'Account data could not be loaded.');
  return response.json();
}

export async function getCreditBalance(): Promise<AccountData['balance']> {
  const response = await fetch(endpoint('/api/account/credits'), { headers: await authHeaders() });
  if (!response.ok) throw await responseError(response, 'Credit balance could not be loaded.');
  return response.json();
}

export async function getCheckoutStatus(id: string): Promise<{ checkout: { credits_purchased: number; status: string } | null }> {
  const response = await fetch(endpoint(`/api/payments/checkout/${encodeURIComponent(id)}`), { headers: await authHeaders() });
  if (!response.ok) throw await responseError(response, 'Checkout status could not be loaded.');
  return response.json();
}
