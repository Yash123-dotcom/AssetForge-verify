import { CheckResult, pipelineNames, VerifyRequest } from '../types/verify.types.js';

export function evaluatePipeline(input: VerifyRequest): CheckResult {
  if (input.asset.metadata?.fieldConfidence?.pipeline === 'UNKNOWN') return { id: 'pipeline', category: 'Render pipeline', status: 'WARNING', severity: 'INFO', scoreImpact: 0, message: 'Not enough package data was found to confirm the asset render pipeline.' };
  const matches = input.project.pipeline === input.asset.pipeline;
  return {
    id: 'pipeline',
    category: 'Render pipeline',
    status: matches ? 'PASS' : 'FAIL',
    severity: matches ? 'INFO' : 'CRITICAL',
    scoreImpact: matches ? 20 : -30,
    message: matches
      ? `The asset and project both use ${pipelineNames[input.project.pipeline]}.`
      : `The asset targets ${pipelineNames[input.asset.pipeline]} while your project uses ${pipelineNames[input.project.pipeline]}.`,
  };
}
