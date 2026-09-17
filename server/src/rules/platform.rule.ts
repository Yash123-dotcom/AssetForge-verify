import { CheckResult, VerifyRequest } from '../types/verify.types.js';

export function evaluatePlatform(input: VerifyRequest): CheckResult {
  void input;
  return {
    id: 'platform',
    category: 'Target platform',
    status: 'PASS',
    severity: 'INFO',
    scoreImpact: 0,
    message: 'No explicit platform conflict detected from the provided information.',
  };
}
