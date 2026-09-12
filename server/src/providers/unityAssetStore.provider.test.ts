import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchUnityAssetStoreListing } from './unityAssetStore.provider.js';

afterEach(() => vi.unstubAllGlobals());

describe('Unity provider', () => {
  it('converts a network timeout into a safe error', async () => {
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    await expect(fetchUnityAssetStoreListing('https://assetstore.unity.com/packages/test-1', 5)).rejects.toThrow('timed out');
  });

  it('stops reading a streamed response once the size limit is exceeded', async () => {
    const oversizedChunk = new Uint8Array(2_000_001);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(oversizedChunk);
        controller.close();
      },
    }), { status: 200 })));
    await expect(fetchUnityAssetStoreListing('https://assetstore.unity.com/packages/test-1')).rejects.toThrow('too large');
  });
});
