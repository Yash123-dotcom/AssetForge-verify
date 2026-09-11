import { evaluateDependencies } from '../rules/dependency.rule.js';
import { evaluatePipeline } from '../rules/pipeline.rule.js';
import { evaluatePlatform } from '../rules/platform.rule.js';
import { evaluateShaders } from '../rules/shader.rule.js';
import { evaluateUnityVersion } from '../rules/unityVersion.rule.js';
import { VerifyRequest, VerifyResponse } from '../types/verify.types.js';
import { generateRecommendations } from './recommendation.service.js';
import { calculateRisk, calculateScore } from './scoring.service.js';

export function verifyCompatibility(input: VerifyRequest): VerifyResponse {
  const checks = [
    evaluatePipeline(input),
    evaluateUnityVersion(input),
    evaluateShaders(input),
    evaluateDependencies(input),
    evaluatePlatform(input),
  ];
  const score = calculateScore(checks);
  const risk = calculateRisk(score);
  const summary = risk === 'LOW'
    ? 'This asset looks likely to be compatible with your setup, though you should still test it before production use.'
    : risk === 'MEDIUM'
      ? 'This asset may work with your setup, but a few areas are worth checking carefully before import.'
      : 'This asset has significant potential compatibility issues. Consider an alternative or plan for manual fixes.';

  return { score, risk, summary, checks, recommendations: generateRecommendations(checks) };
}
