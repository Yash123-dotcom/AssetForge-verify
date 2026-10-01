import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PersistenceError } from '../lib/errors.js';
import type { AssetListingAnalysis } from '../types/verify.types.js';

const state = vi.hoisted(() => ({
  rows: new Map<string, { normalized_url: string; analysis: AssetListingAnalysis; source_provider: 'FIRECRAWL' | 'UNITY_ASSET_STORE_HTML'; fetched_at: string; expires_at: string }>(),
  firecrawl: vi.fn(), legacy: vi.fn(), events: vi.fn(),
}));

vi.mock('../providers/firecrawlAssetStore.provider.js', async () => {
  const actual = await vi.importActual<typeof import('../providers/firecrawlAssetStore.provider.js')>('../providers/firecrawlAssetStore.provider.js');
  return { ...actual, fetchFirecrawlAssetStoreListing: state.firecrawl };
});
vi.mock('../providers/unityAssetStore.provider.js', () => ({ fetchUnityAssetStoreListing: state.legacy }));
vi.mock('../repositories/asset-listing-cache.repository.js', () => ({
  loadListingCache: vi.fn(async (url: string) => state.rows.get(url) ?? null),
  saveListingCache: vi.fn(async (row: { normalized_url: string; analysis: AssetListingAnalysis; source_provider: 'FIRECRAWL' | 'UNITY_ASSET_STORE_HTML'; fetched_at: string; expires_at: string }) => { state.rows.set(row.normalized_url, row); }),
}));
vi.mock('../repositories/metrics.repository.js', () => ({ createBetaEvent: state.events }));

const { analyzeAssetUrl } = await import('./asset-analysis.service.js');

const listing = {
  assetName: 'Fire', publisherName: 'Studio', category: 'VFX', description: 'URP Shader Graph effect', unityVersions: ['2022.3'],
  renderPipelines: ['URP'], dependencies: ['Cinemachine'], requiredPackages: [], supportedPlatforms: ['Windows'],
  features: [], shaderSignals: ['Shader Graph'], documentationLinks: [], latestUpdate: null, packageVersion: '1.0.0',
};

beforeEach(() => {
  state.rows.clear();
  state.firecrawl.mockReset().mockResolvedValue(listing);
  state.legacy.mockReset();
  state.events.mockReset().mockResolvedValue(undefined);
});

describe('Asset Store acquisition', () => {
  it('uses one Firecrawl extraction for concurrent duplicate requests and then serves the cache', async () => {
    const url = 'https://assetstore.unity.com/packages/vfx/firecrawl-test-1';
    const [first, second] = await Promise.all([analyzeAssetUrl(url), analyzeAssetUrl(url)]);
    const third = await analyzeAssetUrl(url);
    expect(state.firecrawl).toHaveBeenCalledTimes(1);
    expect(first.sourceMetadata?.provider).toBe('FIRECRAWL');
    expect(second.assetName).toBe('Fire');
    expect(third.sourceMetadata?.cache).toBe('HIT');
  });

  it('returns clearly marked stale cached data when acquisition paths are unavailable', async () => {
    const url = 'https://assetstore.unity.com/packages/vfx/firecrawl-test-stale';
    state.rows.set(url, {
      normalized_url: url,
      analysis: { source: 'UNITY_ASSET_STORE', url, assetName: 'Cached Fire', publisherName: null, category: null, unityVersion: '2022', pipelineSupport: ['URP'], dependencies: [], customShaders: 'UNKNOWN', platforms: [], latestUpdate: null, description: null, packageVersion: null, confidence: { unityVersion: 'HIGH', pipeline: 'HIGH', dependencies: 'LOW', shaders: 'LOW' } },
      source_provider: 'FIRECRAWL', fetched_at: '2026-01-01T00:00:00.000Z', expires_at: '2026-01-02T00:00:00.000Z',
    });
    state.firecrawl.mockRejectedValue(new PersistenceError('Unavailable'));
    state.legacy.mockRejectedValue(new PersistenceError('Unavailable'));
    const result = await analyzeAssetUrl(url);
    expect(result.assetName).toBe('Cached Fire');
    expect(result.sourceMetadata?.cache).toBe('STALE_FALLBACK');
  });
});
