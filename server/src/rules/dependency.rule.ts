import { CheckResult, VerifyRequest } from '../types/verify.types.js';

export function evaluateDependencies(input: VerifyRequest): CheckResult {
  const dependencies = input.asset.dependencies;
  const count = dependencies.length;
  let status: CheckResult['status'] = 'PASS';
  let severity: CheckResult['severity'] = 'INFO';
  let scoreImpact = 10;
  let message = 'No external dependencies were reported.';

  if (count >= 1 && count <= 2) {
    severity = 'LOW';
    scoreImpact = 5;
    message = `${count} external ${count === 1 ? 'dependency was' : 'dependencies were'} reported. Confirm the required package versions.`;
  } else if (count >= 3 && count <= 4) {
    severity = 'MEDIUM';
    status = 'WARNING'; scoreImpact = 0;
    message = `${count} external dependencies were reported. Review them for package version conflicts.`;
  } else if (count >= 5) {
    severity = 'MEDIUM';
    status = 'WARNING'; scoreImpact = -5;
    message = `${count} external dependencies increase the chance of package version conflicts.`;
  }

  return { id: 'dependencies', category: 'Dependencies', status, severity, scoreImpact, message, details: dependencies };
}
