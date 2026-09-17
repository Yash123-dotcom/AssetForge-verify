import { describe, expect, it } from 'vitest';
import { CONFIDENCE_PRIORITY, preferHigherConfidence } from '../lib/confidence.js';
import { normalizeAssetName, normalizeAssetUrl, normalizeUnityGeneration } from '../lib/normalization.js';
import type { VerifyRequest } from '../types/verify.types.js';
import { calculatePredictionAlignment } from './alignment.service.js';
import { verifyCompatibility } from './verification.service.js';
import { withLegacySeverity } from '../repositories/report.repository.js';

const base: VerifyRequest = { project: { unityVersion: '6000', pipeline: 'URP', platform: 'WINDOWS' }, asset: { testedUnityVersion: '6000', pipeline: 'URP', customShaders: false, dependencies: [] } };

describe('v0.5 scoring hardening', () => {
  it('prioritizes a pipeline mismatch as critical and mentions it in the summary', () => {
    const result = verifyCompatibility({ ...base, asset: { ...base.asset, pipeline: 'HDRP' } });
    expect(result.checks[0]).toMatchObject({ id: 'pipeline', status: 'FAIL', severity: 'CRITICAL' });
    expect(result.summary).toContain('render pipeline');
  });

  it('marks large version gaps high and custom shaders medium when pipelines match', () => {
    const result = verifyCompatibility({ ...base, asset: { ...base.asset, testedUnityVersion: '2021', customShaders: true } });
    expect(result.checks.find((check) => check.id === 'unity-version')?.severity).toBe('HIGH');
    expect(result.checks.find((check) => check.id === 'shaders')?.severity).toBe('MEDIUM');
  });

  it('handles both no dependencies and many dependencies', () => {
    expect(verifyCompatibility(base).checks.find((check) => check.id === 'dependencies')).toMatchObject({ status: 'PASS', severity: 'INFO' });
    const many = verifyCompatibility({ ...base, asset: { ...base.asset, dependencies: ['A', 'B', 'C', 'D', 'E'] } });
    expect(many.checks.find((check) => check.id === 'dependencies')).toMatchObject({ status: 'WARNING', severity: 'MEDIUM' });
  });

  it('keeps compatibility verification inside the 500ms server budget', () => {
    const started = performance.now();
    for (let index = 0; index < 1000; index += 1) verifyCompatibility(base);
    expect(performance.now() - started).toBeLessThan(500);
  });
});

describe('normalization and confidence', () => {
  it('normalizes future comparison fields safely', () => {
    expect(normalizeUnityGeneration('6000')).toBe('UNITY_6');
    expect(normalizeAssetName('  Fancy   SHADER  ')).toBe('fancy shader');
    expect(normalizeAssetUrl('https://assetstore.unity.com/packages/vfx/demo-123/?aid=1#test')).toBe('https://assetstore.unity.com/packages/vfx/demo-123');
  });

  it('makes user input outrank listing confidence and unknown data rank last', () => {
    expect(CONFIDENCE_PRIORITY.USER).toBeGreaterThan(CONFIDENCE_PRIORITY.HIGH);
    expect(CONFIDENCE_PRIORITY.LOW).toBeGreaterThan(CONFIDENCE_PRIORITY.UNKNOWN);
    expect(preferHigherConfidence({ value: 'URP', confidence: 'LOW' }, { value: 'HDRP', confidence: 'USER' })).toEqual({ value: 'HDRP', confidence: 'USER' });
  });

  it('adds severity to checks stored by previous report versions', () => {
    const legacy = { id: 'pipeline', category: 'Render pipeline', status: 'FAIL', scoreImpact: -30, message: 'Mismatch' };
    expect(withLegacySeverity(legacy as never).severity).toBe('CRITICAL');
  });
});

describe('prediction alignment', () => {
  it.each([
    ['LOW', 'WORKED', 'ALIGNED'], ['HIGH', 'FAILED', 'ALIGNED'], ['LOW', 'FAILED', 'MISMATCH'], ['HIGH', 'WORKED', 'MISMATCH'], ['MEDIUM', 'PARTIAL', 'ALIGNED'], ['MEDIUM', 'WORKED', 'PARTIAL'],
  ] as const)('maps %s risk and %s outcome to %s', (risk, outcome, expected) => {
    expect(calculatePredictionAlignment(risk, outcome)).toBe(expected);
  });
});
