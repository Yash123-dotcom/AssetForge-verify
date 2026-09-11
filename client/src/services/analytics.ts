type AnalyticsEvent = 'asset_url_submitted' | 'asset_analysis_success' | 'asset_analysis_partial' | 'asset_analysis_failed' | 'metadata_corrected' | 'verification_started' | 'report_created';
export function trackEvent(event: AnalyticsEvent, properties: Record<string, string | number | boolean> = {}): void { if (import.meta.env.DEV) console.info('[AssetForge event]', event, properties); }
