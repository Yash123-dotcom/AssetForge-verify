import { z } from 'zod';

export const betaEventSchema = z.object({
  event: z.enum(['beta_started', 'verify_started', 'verify_abandoned', 'analysis_succeeded', 'analysis_failed', 'report_viewed', 'top_issue_seen', 'feedback_started', 'feedback_completed', 'usefulness_submitted', 'assetforge_cta_clicked', 'retry_after_error', 'report_shared']),
  durationMs: z.number().int().min(0).max(600000).optional(),
  isDemo: z.boolean().optional().default(false),
}).strict();
