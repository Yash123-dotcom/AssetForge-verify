export function normalizeUnityGeneration(value: string): string {
  return value.trim().toUpperCase() === '6000' ? 'UNITY_6' : `UNITY_${value.trim().replace(/[^0-9]/g, '') || 'UNKNOWN'}`;
}

export function normalizeAssetName(value?: string): string | null {
  const normalized = value?.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
  return normalized || null;
}

export function normalizeAssetUrl(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.hash = '';
    url.search = '';
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}
