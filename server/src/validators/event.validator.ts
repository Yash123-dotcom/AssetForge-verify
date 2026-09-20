import { z } from 'zod';

export const betaEventSchema = z.object({
  event: z.enum(['beta_started', 'verify_started', 'verify_abandoned', 'analysis_succeeded', 'analysis_failed', 'report_viewed', 'top_issue_seen', 'feedback_started', 'feedback_completed', 'usefulness_submitted', 'assetforge_cta_clicked', 'retry_after_error', 'report_shared', 'deep_scan_started', 'deep_scan_failed', 'deep_scan_timed_out', 'deep_scan_report_viewed', 'pricing_viewed', 'credit_pack_selected', 'checkout_started', 'checkout_failed', 'deep_scan_paywall_seen', 'deep_scan_purchase_prompt_clicked']),
  durationMs: z.number().int().min(0).max(600000).optional(),
  isDemo: z.boolean().optional().default(false),
}).strict();
