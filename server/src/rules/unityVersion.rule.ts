import { CheckResult, unityVersionNames, UnityVersion, VerifyRequest } from '../types/verify.types.js';

const generations: Record<UnityVersion, number> = { '2021': 0, '2022': 1, '2023': 2, '6000': 3 };

export function evaluateUnityVersion(input: VerifyRequest): CheckResult {
  if (input.asset.metadata?.fieldConfidence?.unityVersion === 'UNKNOWN') return { id: 'unity-version', category: 'Unity version', status: 'WARNING', severity: 'INFO', scoreImpact: 0, message: 'Not enough package data was found to confirm the asset Unity generation.' };
  const project = input.project.unityVersion;
  const asset = input.asset.testedUnityVersion;
  const gap = Math.abs(generations[project] - generations[asset]);
  const names = `${unityVersionNames[asset]} and ${unityVersionNames[project]}`;

  if (gap === 0) {
    return { id: 'unity-version', category: 'Unity version', status: 'PASS', severity: 'INFO', scoreImpact: 15, message: `The asset was tested on the same Unity generation as your project.` };
  }
  if (gap === 1) {
    return { id: 'unity-version', category: 'Unity version', status: 'WARNING', severity: 'LOW', scoreImpact: 5, message: `${names} are one generation apart. It is likely workable, but test the asset after import.` };
  }
  if (gap === 2) {
    return { id: 'unity-version', category: 'Unity version', status: 'WARNING', severity: 'HIGH', scoreImpact: -10, message: `${names} are two generations apart. Older assets may still work but can require updates.` };
  }
  return { id: 'unity-version', category: 'Unity version', status: 'FAIL', severity: 'HIGH', scoreImpact: -20, message: `${names} are three generations apart. Expect compatibility testing and possible manual fixes.` };
}
