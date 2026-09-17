import { track } from '@vercel/analytics';

type AnalyticsEvent = 'asset_url_submitted' | 'asset_analysis_success' | 'asset_analysis_partial' | 'asset_analysis_failed' | 'metadata_corrected' | 'verification_started' | 'report_created' | 'beta_started' | 'verify_abandoned' | 'report_viewed' | 'top_issue_seen' | 'feedback_started' | 'feedback_completed' | 'usefulness_submitted' | 'assetforge_cta_clicked' | 'retry_after_error' | 'report_shared';

const API_URL = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:4000' : '')).replace(/\/$/, '');
const internalEvents: Partial<Record<AnalyticsEvent, string>> = {
  verification_started: 'verify_started', asset_analysis_success: 'analysis_succeeded', asset_analysis_partial: 'analysis_succeeded', asset_analysis_failed: 'analysis_failed',
  beta_started: 'beta_started', verify_abandoned: 'verify_abandoned', report_viewed: 'report_viewed', top_issue_seen: 'top_issue_seen', feedback_started: 'feedback_started', feedback_completed: 'feedback_completed', usefulness_submitted: 'usefulness_submitted', assetforge_cta_clicked: 'assetforge_cta_clicked', retry_after_error: 'retry_after_error', report_shared: 'report_shared',
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
