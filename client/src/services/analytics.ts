import { track } from '@vercel/analytics';

type AnalyticsEvent = 'asset_url_submitted' | 'asset_analysis_success' | 'asset_analysis_partial' | 'asset_analysis_failed' | 'metadata_corrected' | 'verification_started' | 'report_created' | 'beta_started' | 'verify_abandoned' | 'report_viewed' | 'top_issue_seen' | 'feedback_started' | 'feedback_completed' | 'usefulness_submitted' | 'assetforge_cta_clicked' | 'retry_after_error' | 'report_shared' | 'deep_scan_started' | 'deep_scan_completed' | 'deep_scan_failed' | 'deep_scan_timed_out' | 'deep_scan_report_viewed' | 'pricing_viewed' | 'credit_pack_selected' | 'checkout_started' | 'checkout_completed' | 'checkout_failed' | 'credit_added' | 'deep_scan_paywall_seen' | 'deep_scan_credit_used' | 'deep_scan_purchase_prompt_clicked';

const API_URL = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:4000' : '')).replace(/\/$/, '');
const internalEvents: Partial<Record<AnalyticsEvent, string>> = {
  verification_started: 'verify_started', asset_analysis_success: 'analysis_succeeded', asset_analysis_partial: 'analysis_succeeded', asset_analysis_failed: 'analysis_failed',
  beta_started: 'beta_started', verify_abandoned: 'verify_abandoned', report_viewed: 'report_viewed', top_issue_seen: 'top_issue_seen', feedback_started: 'feedback_started', feedback_completed: 'feedback_completed', usefulness_submitted: 'usefulness_submitted', assetforge_cta_clicked: 'assetforge_cta_clicked', retry_after_error: 'retry_after_error', report_shared: 'report_shared',
  deep_scan_report_viewed: 'deep_scan_report_viewed',
  pricing_viewed: 'pricing_viewed', credit_pack_selected: 'credit_pack_selected', deep_scan_paywall_seen: 'deep_scan_paywall_seen', deep_scan_purchase_prompt_clicked: 'deep_scan_purchase_prompt_clicked',
};

export function trackEvent(
  event: AnalyticsEvent,
  properties: Record<string, string | number | boolean> = {},
): void {
  if (import.meta.env.PROD) {
    track(event, properties);
    const internalEvent = internalEvents[event];
    if (internalEvent && API_URL) {
      const durationMs = typeof properties.duration_ms === 'number' ? Math.round(properties.duration_ms) : undefined;
      const isDemo = properties.is_demo === true;
      void fetch(`${API_URL}/api/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: internalEvent, durationMs, isDemo }), keepalive: true }).catch(() => undefined);
    }
    return;
  }

  console.info('[AssetForge event]', event, properties);
}
