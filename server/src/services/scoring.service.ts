import { CheckResult, Risk } from '../types/verify.types.js';

export function calculateScore(checks: CheckResult[]): number {
  return Math.min(100, Math.max(0, 70 + checks.reduce((sum, check) => sum + check.scoreImpact, 0)));
}

export function calculateRisk(score: number): Risk {
  if (score >= 80) return 'LOW';
  if (score >= 55) return 'MEDIUM';
  return 'HIGH';
}
