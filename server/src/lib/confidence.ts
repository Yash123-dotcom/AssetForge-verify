import { DataConfidence } from '../types/verify.types.js';

export const CONFIDENCE_PRIORITY: Readonly<Record<DataConfidence, number>> = {
  UNKNOWN: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  PACKAGE: 4,
  USER: 5,
};

export function preferHigherConfidence<T>(
  current: { value: T; confidence: DataConfidence },
  candidate: { value: T; confidence: DataConfidence },
): { value: T; confidence: DataConfidence } {
  return CONFIDENCE_PRIORITY[candidate.confidence] > CONFIDENCE_PRIORITY[current.confidence] ? candidate : current;
}
