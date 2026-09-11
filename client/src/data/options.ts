import type { Pipeline, Platform, UnityVersion } from '../types/verify.types';

export const unityVersions: { value: UnityVersion; label: string }[] = [
  { value: '2021', label: 'Unity 2021 LTS' }, { value: '2022', label: 'Unity 2022 LTS' },
  { value: '2023', label: 'Unity 2023' }, { value: '6000', label: 'Unity 6' },
];
export const pipelines: { value: Pipeline; label: string }[] = [
  { value: 'BUILT_IN', label: 'Built-in Render Pipeline' }, { value: 'URP', label: 'Universal Render Pipeline (URP)' }, { value: 'HDRP', label: 'High Definition Render Pipeline (HDRP)' },
];
export const platforms: { value: Platform; label: string }[] = [
  { value: 'WINDOWS', label: 'Windows' }, { value: 'MAC', label: 'macOS' }, { value: 'ANDROID', label: 'Android' }, { value: 'IOS', label: 'iOS' }, { value: 'WEBGL', label: 'WebGL' },
];
