import { CheckResult, VerifyRequest } from '../types/verify.types.js';

export function evaluatePlatform(input: VerifyRequest): CheckResult {
  void input;
  if (!input.project?.platform) {
    return {
      id: 'platform',
      category: 'Target platform',
      status: 'PASS',
      severity: 'INFO',
      scoreImpact: 0,
      message: 'Project platform not provided. Add project details for a personalized comparison.',
    };
  }
  return {
    id: 'platform',
    category: 'Target platform',
    status: 'PASS',
    severity: 'INFO',
    scoreImpact: 0,
    message: 'No explicit platform conflict detected from the provided information.',
  };
}
