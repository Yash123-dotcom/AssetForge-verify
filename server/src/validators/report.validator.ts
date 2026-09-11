import { z } from 'zod';

export const reportIdSchema = z.uuid('Report ID must be a valid UUID.');
export const feedbackSchema = z.object({
  outcome: z.enum(['WORKED', 'PARTIAL', 'FAILED']),
  comment: z.string().trim().max(500, 'Comment must be 500 characters or fewer.').optional(),
}).strict();
