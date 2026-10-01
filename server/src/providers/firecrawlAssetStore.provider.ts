import { z } from 'zod';
import { AssetFetchTimeoutError, PersistenceError } from '../lib/errors.js';

const FIRECRAWL_SCRAPE_URL = 'https://api.firecrawl.dev/v2/scrape';
const timeoutMs = 12_000;

const shortText = z.string().trim().max(300).nullable().optional();
const values = (max: number) => z.array(z.string().trim().min(1).max(300)).max(max).optional().default([]);

// This is deliberately a small, bounded representation of a public listing.
// It prevents an upstream extraction response from becoming untrusted report data.
export const firecrawlListingSchema = z.object({
  assetName: shortText,
  publisherName: shortText,
  category: shortText,
  description: z.string().trim().max(10_000).nullable().optional(),
  unityVersions: values(12),
  renderPipelines: values(6),
  dependencies: values(30),
  requiredPackages: values(30),
  supportedPlatforms: values(12),
  features: values(30),
  shaderSignals: values(20),
  documentationLinks: z.array(z.string().url().max(2_048)).max(10).optional().default([]),
  latestUpdate: shortText,
  packageVersion: shortText,
}).strict();

export type FirecrawlListing = z.infer<typeof firecrawlListingSchema>;

export class FirecrawlUnavailableError extends Error {}

const extractionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    assetName: { type: ['string', 'null'] }, publisherName: { type: ['string', 'null'] }, category: { type: ['string', 'null'] },
    description: { type: ['string', 'null'] }, unityVersions: { type: 'array', items: { type: 'string' } },
    renderPipelines: { type: 'array', items: { type: 'string' } }, dependencies: { type: 'array', items: { type: 'string' } },
    requiredPackages: { type: 'array', items: { type: 'string' } }, supportedPlatforms: { type: 'array', items: { type: 'string' } },
    features: { type: 'array', items: { type: 'string' } }, shaderSignals: { type: 'array', items: { type: 'string' } },
    documentationLinks: { type: 'array', items: { type: 'string' } }, latestUpdate: { type: ['string', 'null'] }, packageVersion: { type: ['string', 'null'] },
  },
};

function resultJson(body: unknown): unknown {
  if (!body || typeof body !== 'object') return undefined;
  const value = body as { json?: unknown; data?: { json?: unknown } };
  return value.json ?? value.data?.json;
}

export async function fetchFirecrawlAssetStoreListing(url: string): Promise<FirecrawlListing> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new FirecrawlUnavailableError('Firecrawl is not configured.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(FIRECRAWL_SCRAPE_URL, {
      method: 'POST', signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        onlyMainContent: true,
        proxy: 'basic',
        formats: [{
          type: 'json', schema: extractionSchema,
          prompt: 'Extract only facts explicitly present in this Unity Asset Store listing. Do not infer compatibility. Use null or [] when a value is absent. Capture Unity versions, render pipeline support, dependencies, required packages, supported platforms, shader or VFX/Shader Graph signals, documentation links, and version/update details when stated.',
        }],
      }),
    });
    if (!response.ok) throw new PersistenceError('The listing analysis service could not be reached.');
    const payload = await response.json().catch(() => undefined);
    const parsed = firecrawlListingSchema.safeParse(resultJson(payload));
    if (!parsed.success) throw new PersistenceError('The listing analysis returned incomplete data.');
    return parsed.data;
  } catch (error) {
    if (error instanceof FirecrawlUnavailableError || error instanceof PersistenceError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw new AssetFetchTimeoutError('The listing analysis timed out.');
    throw new PersistenceError('The listing analysis service could not be reached.');
  } finally {
    clearTimeout(timeout);
  }
}
