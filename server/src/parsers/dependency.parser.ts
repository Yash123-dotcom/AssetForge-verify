import { DependencySignal } from '../types/deep-scan.types.js';

const knownDependencies: Array<{ name: string; patterns: RegExp[] }> = [
  { name: 'Cinemachine', patterns: [/\bCinemachine\b/i, /com\.unity\.cinemachine/i] },
  { name: 'TextMeshPro', patterns: [/\bTMPro\b/, /com\.unity\.textmeshpro/i] },
  { name: 'Input System', patterns: [/UnityEngine\.InputSystem/, /com\.unity\.inputsystem/i] },
  { name: 'Addressables', patterns: [/UnityEngine\.AddressableAssets/, /com\.unity\.addressables/i] },
  { name: 'Localization', patterns: [/UnityEngine\.Localization/, /com\.unity\.localization/i] },
  { name: 'URP', patterns: [/com\.unity\.render-pipelines\.universal/i, /Rendering\.Universal/] },
  { name: 'HDRP', patterns: [/com\.unity\.render-pipelines\.high-definition/i, /Rendering\.HighDefinition/] },
];

export function detectDependencies(text: string, source: string, confidence: DependencySignal['confidence'] = 'MEDIUM'): DependencySignal[] {
  return knownDependencies.filter((candidate) => candidate.patterns.some((pattern) => pattern.test(text))).map((candidate) => ({ name: candidate.name, source, confidence }));
}

export function packageDisplayName(identifier: string): string {
  return knownDependencies.find((candidate) => candidate.patterns.some((pattern) => pattern.test(identifier)))?.name ?? identifier;
}
