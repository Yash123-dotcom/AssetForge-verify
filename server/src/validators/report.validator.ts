import { z } from 'zod';

export const reportIdSchema = z.uuid('Report ID must be a valid UUID.');
export const feedbackSchema = z.object({
  outcome: z.enum(['WORKED', 'PARTIAL', 'FAILED']),
  category: z.enum(['RENDER_PIPELINE', 'UNITY_VERSION', 'SHADERS_MATERIALS', 'DEPENDENCIES', 'MISSING_SCRIPTS', 'PLATFORM_SPECIFIC', 'OTHER']).optional(),
  comment: z.string().trim().max(500, 'Comment must be 500 characters or fewer.').optional(),
}).strict();

export const usefulnessSchema = z.object({
  rating: z.enum(['YES', 'SOMEWHAT', 'NO']),
  comment: z.string().trim().max(500, 'Comment must be 500 characters or fewer.').optional(),
}).strict();
