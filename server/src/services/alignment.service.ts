import { FeedbackOutcome, PredictionAlignment, Risk } from '../types/verify.types.js';

export function calculatePredictionAlignment(risk: Risk, outcome: FeedbackOutcome): PredictionAlignment {
  if (risk === 'MEDIUM') return outcome === 'PARTIAL' ? 'ALIGNED' : 'PARTIAL';
  if ((risk === 'LOW' && outcome === 'WORKED') || (risk === 'HIGH' && outcome === 'FAILED')) return 'ALIGNED';
  if ((risk === 'LOW' && outcome === 'FAILED') || (risk === 'HIGH' && outcome === 'WORKED')) return 'MISMATCH';
  return 'PARTIAL';
}
