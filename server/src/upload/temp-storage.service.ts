import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const PREFIX = 'assetforge-deep-scan-';
const ROOT = resolve(tmpdir());

export async function createScanTempDirectory(): Promise<string> {
  return mkdtemp(join(ROOT, PREFIX));
}

export async function cleanupScanTempDirectory(directory: string): Promise<void> {
  const target = resolve(directory);
  if (!target.startsWith(`${ROOT}\\`) && !target.startsWith(`${ROOT}/`)) throw new Error('Refusing to clean a path outside the temporary directory.');
  if (!target.split(/[\\/]/).pop()?.startsWith(PREFIX)) throw new Error('Refusing to clean an unrelated temporary directory.');
  await rm(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 75 });
}

export async function cleanupStaleScanDirectories(maxAgeMs = 60 * 60 * 1000): Promise<number> {
  const entries = await readdir(ROOT, { withFileTypes: true });
  let removed = 0;
  await Promise.all(entries.filter((entry) => entry.isDirectory() && entry.name.startsWith(PREFIX)).map(async (entry) => {
    const path = join(ROOT, entry.name);
    const details = await stat(path);
    if (Date.now() - details.mtimeMs > maxAgeMs) { await cleanupScanTempDirectory(path); removed += 1; }
  }));
  return removed;
}
