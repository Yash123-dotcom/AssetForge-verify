import { detectDependencies } from './dependency.parser.js';

export function inspectScript(text: string, path: string) {
  const findings: string[] = [];
  const pipelineScores = { BUILT_IN: 0, URP: 0, HDRP: 0 };
  if (/using\s+UnityEngine\.Rendering\.Universal\s*;/.test(text)) pipelineScores.URP += 2;
  if (/using\s+UnityEngine\.Rendering\.HighDefinition\s*;/.test(text)) pipelineScores.HDRP += 2;
  if (/\bUnityEditor\b/.test(text)) findings.push('UnityEditor references detected.');
  if (/(^|\/)Editor(\/|$)/i.test(path)) findings.push('Editor-only scripts detected.');
  if (/^\s*#\s*(?:if|elif)\b/m.test(text)) findings.push('Conditional compilation symbols detected.');
  if (/\b(?:Application\.LoadLevel|OnLevelWasLoaded|WWW\s*\()/.test(text)) findings.push('Legacy Unity API indicators detected.');
  const unityVersionHints = Array.from(new Set(text.match(/\b(?:20(?:2[1-9]|3\d)|6000)\.\d+(?:\.\d+)?[a-z]?\d*\b/g) ?? []));
  return { pipelineScores, dependencies: detectDependencies(text, path, 'HIGH'), findings, unityVersionHints };
}
