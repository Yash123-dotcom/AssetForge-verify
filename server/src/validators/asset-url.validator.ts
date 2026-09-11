import { isIP } from 'node:net';
import { z } from 'zod';

export class UnsupportedAssetUrlError extends Error {}
export const assetUrlBodySchema = z.object({ url: z.string().trim().min(1).max(2048) }).strict();

export function normalizeAssetStoreUrl(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new TypeError('Enter a valid Asset Store URL.'); }
  if (url.protocol !== 'https:') throw new UnsupportedAssetUrlError('Only HTTPS Unity Asset Store URLs are supported.');
  const hostname = url.hostname.toLowerCase();
  if (hostname !== 'assetstore.unity.com' || isIP(hostname)) throw new UnsupportedAssetUrlError('Only assetstore.unity.com listing URLs are supported.');
  if (!url.pathname.startsWith('/packages/')) throw new UnsupportedAssetUrlError('The URL must point to a Unity Asset Store package listing.');
  url.hash = ''; url.search = '';
  return url.toString();
}
