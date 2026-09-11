import { CheckResult, VerifyRequest } from '../types/verify.types.js';

export function evaluateShaders(input: VerifyRequest): CheckResult {
  if (!input.asset.customShaders) {
    return { id: 'shaders', category: 'Shaders', status: 'PASS', scoreImpact: 10, message: 'No custom shaders were reported for this asset.' };
  }
  const pipelinesMatch = input.project.pipeline === input.asset.pipeline;
  return {
    id: 'shaders',
    category: 'Custom shaders',
    status: pipelinesMatch ? 'WARNING' : 'FAIL',
    scoreImpact: pipelinesMatch ? 0 : -15,
    message: pipelinesMatch
      ? 'Custom shaders are present. Review their rendering and materials after import.'
      : 'Custom shaders may require manual changes when moving between render pipelines.',
  };
}
