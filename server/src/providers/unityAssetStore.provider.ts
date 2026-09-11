import { PersistenceError } from '../lib/errors.js';

const MAX_BYTES = 2_000_000;

export async function fetchUnityAssetStoreListing(url: string, timeoutMs = 8000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let target = url;
    let response: Response | undefined;
    for (let redirects = 0; redirects <= 3; redirects += 1) {
      response = await fetch(target, { redirect: 'manual', signal: controller.signal, headers: { 'user-agent': 'AssetForgeVerify/0.3 (+https://assetforge.co.in)' } });
      if (response.status < 300 || response.status >= 400) break;
      const location = response.headers.get('location');
      if (!location || redirects === 3) throw new PersistenceError('The Asset Store redirected too many times.');
      const next = new URL(location, target);
      if (next.protocol !== 'https:' || next.hostname.toLowerCase() !== 'assetstore.unity.com' || !next.pathname.startsWith('/packages/')) throw new PersistenceError('The Asset Store redirected to an unsupported location.');
      target = next.toString();
    }
    if (!response) throw new PersistenceError('The Asset Store listing could not be fetched.');
    if (!response.ok) throw new PersistenceError('The Asset Store listing could not be fetched.');
    const length = Number(response.headers.get('content-length') ?? 0);
    if (length > MAX_BYTES) throw new PersistenceError('The Asset Store response was too large.');
    const text = await response.text();
    if (Buffer.byteLength(text) > MAX_BYTES) throw new PersistenceError('The Asset Store response was too large.');
    return text;
  } catch (error) {
    if (error instanceof PersistenceError) throw error;
    throw new PersistenceError(error instanceof Error && error.name === 'AbortError' ? 'The Asset Store request timed out.' : 'The Asset Store listing could not be fetched.');
  } finally { clearTimeout(timeout); }
}
