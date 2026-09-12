import { isIP } from 'node:net';
import { z } from 'zod';

export class UnsupportedAssetUrlError extends Error {}

export function normalizeAssetStoreUrl(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new TypeError('Enter a valid Asset Store URL.'); }
  if (url.protocol !== 'https:') throw new UnsupportedAssetUrlError('Only HTTPS Unity Asset Store URLs are supported.');
  const hostname = url.hostname.toLowerCase();
  if (hostname !== 'assetstore.unity.com' || isIP(hostname) || url.username || url.password || url.port) throw new UnsupportedAssetUrlError('Only assetstore.unity.com listing URLs are supported.');
  if (!url.pathname.startsWith('/packages/')) throw new UnsupportedAssetUrlError('The URL must point to a Unity Asset Store package listing.');
  url.hash = ''; url.search = '';
  return url.toString();
}

export const assetStoreUrlSchema = z.string().trim().min(1).max(2048).transform((value, context) => {
  try { return normalizeAssetStoreUrl(value); }
  catch (error) {
    context.addIssue({ code: 'custom', message: error instanceof Error ? error.message : 'Enter a valid Asset Store URL.' });
    return z.NEVER;
  }
});

export const assetUrlBodySchema = z.object({ url: assetStoreUrlSchema }).strict();
