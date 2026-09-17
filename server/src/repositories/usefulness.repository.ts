import { PersistenceError } from '../lib/errors.js';
import { getSupabase } from '../lib/supabase.js';
import { UsefulnessRating } from '../types/verify.types.js';

export async function createUsefulness(reportId: string, rating: UsefulnessRating, comment?: string): Promise<void> {
  const { error } = await getSupabase().from('report_usefulness').insert({ report_id: reportId, rating, comment: comment || null });
  if (error) throw new PersistenceError('The usefulness response could not be saved.');
}
