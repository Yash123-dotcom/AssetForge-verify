import { describe, expect, it } from 'vitest';
import { parseFirecrawlAssetStore } from './firecrawlAssetStore.parser.js';

const url = 'https://assetstore.unity.com/packages/vfx/example-123';

describe('Firecrawl Asset Store parser', () => {
  it('normalizes explicit compatibility signals for the existing engine', () => {
    const result = parseFirecrawlAssetStore({
      assetName: 'Stylized Fire', publisherName: 'Example Studio', category: 'VFX', description: 'Shader Graph fire effect.',
      unityVersions: ['Unity 2022.3.1f1'], renderPipelines: ['Universal Render Pipeline (URP)'],
      dependencies: ['Cinemachine'], requiredPackages: ['Visual Effect Graph'], supportedPlatforms: ['Windows', 'macOS'],
      features: ['VFX Graph'], shaderSignals: ['Shader Graph'], documentationLinks: ['https://docs.example.com/setup'],
      latestUpdate: 'Sep 1, 2026', packageVersion: '1.2.0',
    }, url);

    expect(result).toMatchObject({
      source: 'UNITY_ASSET_STORE', assetName: 'Stylized Fire', publisherName: 'Example Studio', unityVersion: '2022',
      pipelineSupport: ['URP'], dependencies: ['Cinemachine', 'Visual Effect Graph'], requiredPackages: ['Visual Effect Graph'], customShaders: true,
    });
  });

  it('keeps unknown values unknown instead of inventing compatibility evidence', () => {
    const result = parseFirecrawlAssetStore({
      assetName: null, publisherName: null, category: null, description: null, unityVersions: [], renderPipelines: [], dependencies: [],
      requiredPackages: [], supportedPlatforms: [], features: [], shaderSignals: [], documentationLinks: [], latestUpdate: null, packageVersion: null,
    }, url);
    expect(result.unityVersion).toBeNull();
    expect(result.pipelineSupport).toEqual([]);
    expect(result.customShaders).toBe('UNKNOWN');
  });
});
