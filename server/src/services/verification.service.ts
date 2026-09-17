import { evaluateDependencies } from '../rules/dependency.rule.js';
import { evaluatePipeline } from '../rules/pipeline.rule.js';
import { evaluatePlatform } from '../rules/platform.rule.js';
import { evaluateShaders } from '../rules/shader.rule.js';
import { evaluateUnityVersion } from '../rules/unityVersion.rule.js';
import { VerifyRequest, VerifyResponse } from '../types/verify.types.js';
import { generateRecommendations } from './recommendation.service.js';
import { calculateRisk, calculateScore } from './scoring.service.js';

const severityRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 } as const;

function practicalSummary(risk: VerifyResponse['risk'], checks: VerifyResponse['checks']): string {
  const concerns = checks.filter((check) => check.status !== 'PASS').slice(0, 2).map((check) => check.category.toLowerCase());
  if (!concerns.length) return 'This asset looks compatible with the setup provided. Test it in a backup project before production use.';
  const concernText = concerns.length === 1 ? concerns[0] : `${concerns[0]} and ${concerns[1]}`;
  if (risk === 'LOW') return `This asset should work with a few manual checks. Review ${concernText} before importing.`;
  if (risk === 'MEDIUM') return `This asset may work after some manual fixes. The main risks are ${concernText}.`;
  return `Plan for compatibility work before using this asset. Start with ${concernText}.`;
}

export function verifyCompatibility(input: VerifyRequest, packageSignals?: { dllPresent: boolean; documentationPresent: boolean }): VerifyResponse {
  const checks = [
    evaluatePipeline(input),
    evaluateUnityVersion(input),
    evaluateShaders(input),
    evaluateDependencies(input),
    evaluatePlatform(input),
    ...(packageSignals ? [
      packageSignals.dllPresent
        ? { id: 'package-binaries', category: 'Precompiled plugins', status: 'WARNING' as const, severity: 'MEDIUM' as const, scoreImpact: -3, message: 'The package contains precompiled DLLs. Confirm platform and Unity version support.' }
        : { id: 'package-binaries', category: 'Precompiled plugins', status: 'PASS' as const, severity: 'INFO' as const, scoreImpact: 0, message: 'No precompiled DLLs were detected by static inspection.' },
      packageSignals.documentationPresent
        ? { id: 'package-documentation', category: 'Setup documentation', status: 'PASS' as const, severity: 'INFO' as const, scoreImpact: 0, message: 'Documentation files were detected in the package.' }
        : { id: 'package-documentation', category: 'Setup documentation', status: 'WARNING' as const, severity: 'INFO' as const, scoreImpact: 0, message: 'No obvious setup documentation was found in the package.' },
    ] : []),
  ].sort((left, right) => severityRank[left.severity] - severityRank[right.severity]);
  const score = calculateScore(checks);
  const risk = calculateRisk(score);
  const summary = practicalSummary(risk, checks);

  return { score, risk, summary, checks, recommendations: generateRecommendations(checks) };
}
