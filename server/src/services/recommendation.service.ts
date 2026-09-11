import { CheckResult } from '../types/verify.types.js';

const recommendations: Record<string, string> = {
  pipeline: "Look for a version of this asset designed for your project's render pipeline.",
  'unity-version': 'Test the asset in a backup project or separate branch before importing it into production.',
  shaders: 'Review custom shaders and materials after import, especially if the asset targets another render pipeline.',
  dependencies: 'Review package dependencies and required versions before importing to avoid conflicts.',
};

export function generateRecommendations(checks: CheckResult[]): string[] {
  return checks
    .filter((check) => check.status !== 'PASS')
    .map((check) => recommendations[check.id])
    .filter((item): item is string => Boolean(item));
}
