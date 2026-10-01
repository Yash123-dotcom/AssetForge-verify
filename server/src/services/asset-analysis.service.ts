import { TtlCache } from '../cache/ttl-cache.js';
import { AssetFetchTimeoutError, PersistenceError } from '../lib/errors.js';
import { parseFirecrawlAssetStore } from '../parsers/firecrawlAssetStore.parser.js';
import { parseUnityAssetStore } from '../parsers/unityAssetStore.parser.js';
import { fetchFirecrawlAssetStoreListing, FirecrawlUnavailableError } from '../providers/firecrawlAssetStore.provider.js';
import { fetchUnityAssetStoreListing } from '../providers/unityAssetStore.provider.js';
import { loadListingCache, saveListingCache } from '../repositories/asset-listing-cache.repository.js';
import { createBetaEvent } from '../repositories/metrics.repository.js';
import { AssetListingAnalysis, AssetListingSourceMetadata } from '../types/verify.types.js';
import { normalizeAssetStoreUrl } from '../validators/asset-url.validator.js';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const memoryCache = new TtlCache<AssetListingAnalysis>(5 * 60 * 1000, 500);
const inFlight = new Map<string, Promise<AssetListingAnalysis>>();

function withSource(analysis: AssetListingAnalysis, sourceMetadata: AssetListingSourceMetadata): AssetListingAnalysis {
  return { ...analysis, sourceMetadata };
}

function cacheIsFresh(expiresAt: string): boolean {
  return Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) > Date.now();
}

async function acquireAndCache(url: string, stale: AssetListingAnalysis | null): Promise<AssetListingAnalysis> {
  const retrievedAt = new Date().toISOString();
  await createBetaEvent('asset_store_analysis_started').catch(() => undefined);
  try {
    const analysis = parseFirecrawlAssetStore(await fetchFirecrawlAssetStoreListing(url), url);
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
    await saveListingCache({ normalized_url: url, analysis, source_provider: 'FIRECRAWL', fetched_at: retrievedAt, expires_at: expiresAt }).catch(() => undefined);
    memoryCache.set(url, analysis);
    await createBetaEvent('asset_store_cache_miss').catch(() => undefined);
    await createBetaEvent('asset_store_analysis_completed').catch(() => undefined);
    return withSource(analysis, { provider: 'FIRECRAWL', cache: 'MISS', retrievedAt });
  } catch (firecrawlError) {
    // Preserve the existing acquisition path during Firecrawl outages or local setup.
    try {
      const analysis = parseUnityAssetStore(await fetchUnityAssetStoreListing(url), url);
      const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
      await saveListingCache({ normalized_url: url, analysis, source_provider: 'UNITY_ASSET_STORE_HTML', fetched_at: retrievedAt, expires_at: expiresAt }).catch(() => undefined);
      memoryCache.set(url, analysis);
      await createBetaEvent('asset_store_cache_miss').catch(() => undefined);
      await createBetaEvent('asset_store_analysis_completed').catch(() => undefined);
      return withSource(analysis, { provider: 'UNITY_ASSET_STORE_HTML', cache: 'FALLBACK', retrievedAt });
    } catch (fallbackError) {
      if (stale) {
        await createBetaEvent('asset_store_analysis_failed').catch(() => undefined);
        return withSource(stale, { provider: stale.sourceMetadata?.provider ?? 'FIRECRAWL', cache: 'STALE_FALLBACK', retrievedAt: stale.sourceMetadata?.retrievedAt ?? retrievedAt });
      }
      await createBetaEvent('asset_store_analysis_failed').catch(() => undefined);
      if (firecrawlError instanceof FirecrawlUnavailableError) throw fallbackError;
      if (firecrawlError instanceof AssetFetchTimeoutError) throw firecrawlError;
      throw fallbackError instanceof PersistenceError ? fallbackError : new PersistenceError('The Asset Store listing could not be analyzed.');
    }
  }
}

export async function analyzeAssetUrl(value: string): Promise<AssetListingAnalysis> {
  const url = normalizeAssetStoreUrl(value);
  const memory = memoryCache.get(url);
  if (memory) {
    const retrievedAt = memory.sourceMetadata?.retrievedAt ?? new Date().toISOString();
    await createBetaEvent('asset_store_cache_hit').catch(() => undefined);
    return withSource(memory, { provider: memory.sourceMetadata?.provider ?? 'FIRECRAWL', cache: 'HIT', retrievedAt });
  }

  const cached = await loadListingCache(url).catch(() => null);
  if (cached && cacheIsFresh(cached.expires_at)) {
    memoryCache.set(url, cached.analysis);
    await createBetaEvent('asset_store_cache_hit').catch(() => undefined);
    return withSource(cached.analysis, { provider: cached.source_provider, cache: 'HIT', retrievedAt: cached.fetched_at });
  }

  const current = inFlight.get(url);
  if (current) return current;
  const pending = acquireAndCache(url, cached?.analysis ?? null).finally(() => inFlight.delete(url));
  inFlight.set(url, pending);
  return pending;
}
