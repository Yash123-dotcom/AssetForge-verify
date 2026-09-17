import { DependencySignal } from '../types/deep-scan.types.js';
import { packageDisplayName } from './dependency.parser.js';

export function inspectPackageManifest(text: string, source: string): { packages: string[]; dependencies: DependencySignal[]; malformed: boolean } {
  try {
    const parsed = JSON.parse(text) as { dependencies?: Record<string, unknown>; references?: unknown[] };
    const identifiers = Object.keys(parsed.dependencies ?? {}).filter((key) => key.length <= 160);
    return { packages: identifiers, dependencies: identifiers.map((identifier) => ({ name: packageDisplayName(identifier), source, confidence: 'HIGH' as const })), malformed: false };
  } catch {
    return { packages: [], dependencies: [], malformed: true };
  }
}
