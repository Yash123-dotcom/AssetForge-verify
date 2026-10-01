import { AssetListingAnalysis, Pipeline, UnityVersion } from '../types/verify.types.js';
import { FirecrawlListing } from '../providers/firecrawlAssetStore.provider.js';

function unique(values: string[], max = 30): string[] {
  return [...new Set(values.map((value) => value.replace(/\s+/g, ' ').trim()).filter(Boolean))].slice(0, max);
}

function unityVersion(values: string[]): UnityVersion | null {
  const match = values.join(' ').match(/(?:^|\D)(2021|2022|2023|6000)(?:\D|$)/);
  return match?.[1] as UnityVersion | undefined ?? null;
}

function pipelines(values: string[]): Pipeline[] {
  const text = values.join(' ');
  const result: Pipeline[] = [];
  if (/\b(?:built[ -]?in(?: render pipeline)?|built-in rp)\b/i.test(text)) result.push('BUILT_IN');
  if (/\b(?:universal render pipeline|urp)\b/i.test(text)) result.push('URP');
  if (/\b(?:high definition render pipeline|hdrp)\b/i.test(text)) result.push('HDRP');
  return result;
}

export function parseFirecrawlAssetStore(listing: FirecrawlListing, url: string): AssetListingAnalysis {
  const pipelineSupport = pipelines(listing.renderPipelines);
  const shaderText = [...listing.shaderSignals, ...listing.features, listing.description ?? ''].join(' ');
  const hasPositiveShaderSignal = /\b(?:custom shaders?|shader graph|vfx graph|shaders? included|custom materials?\/shaders?)\b/i.test(shaderText);
  const hasNegativeShaderSignal = /\b(?:no custom shaders?|does not use custom shaders?)\b/i.test(shaderText);
  return {
    source: 'UNITY_ASSET_STORE', url,
    assetName: listing.assetName ?? null, publisherName: listing.publisherName ?? null, category: listing.category ?? null,
    unityVersion: unityVersion(listing.unityVersions), pipelineSupport,
    // The existing compatibility rule evaluates one dependency list. Preserve the
    // distinction for display while feeding explicit required packages into it.
    dependencies: unique([...listing.dependencies, ...listing.requiredPackages]), requiredPackages: unique(listing.requiredPackages),
    customShaders: hasPositiveShaderSignal ? true : hasNegativeShaderSignal ? false : 'UNKNOWN',
    shaderSignals: unique(listing.shaderSignals, 20), features: unique(listing.features), documentationLinks: unique(listing.documentationLinks, 10),
    platforms: unique(listing.supportedPlatforms, 12), latestUpdate: listing.latestUpdate ?? null,
    description: listing.description ?? null, packageVersion: listing.packageVersion ?? null,
    confidence: {
      unityVersion: listing.unityVersions.length ? 'MEDIUM' : 'LOW',
      pipeline: pipelineSupport.length ? 'MEDIUM' : 'LOW',
      dependencies: listing.dependencies.length || listing.requiredPackages.length ? 'MEDIUM' : 'LOW',
      shaders: hasPositiveShaderSignal || hasNegativeShaderSignal ? 'MEDIUM' : 'LOW',
    },
  };
}
