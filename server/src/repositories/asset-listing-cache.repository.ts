import { PersistenceError } from '../lib/errors.js';
import { getSupabase } from '../lib/supabase.js';
import { AssetListingAnalysis } from '../types/verify.types.js';

type CacheRow = { normalized_url: string; analysis: AssetListingAnalysis; source_provider: 'FIRECRAWL' | 'UNITY_ASSET_STORE_HTML'; fetched_at: string; expires_at: string };

export async function loadListingCache(url: string): Promise<CacheRow | null> {
  const { data, error } = await getSupabase().from('asset_listing_cache').select('normalized_url,analysis,source_provider,fetched_at,expires_at').eq('normalized_url', url).maybeSingle<CacheRow>();
  if (error) throw new PersistenceError('The listing cache could not be read.');
  return data;
}

export async function saveListingCache(row: CacheRow): Promise<void> {
  const { error } = await getSupabase().from('asset_listing_cache').upsert(row, { onConflict: 'normalized_url' });
  if (error) throw new PersistenceError('The listing cache could not be saved.');
}
