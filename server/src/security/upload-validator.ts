import { open } from 'node:fs/promises';
import { extname } from 'node:path';
import { z } from 'zod';
import { DeepScanError } from '../lib/errors.js';
import { PIPELINES, PLATFORMS, UNITY_VERSIONS } from '../types/verify.types.js';

export const deepScanProjectSchema = z.object({ projectUnityVersion: z.enum(UNITY_VERSIONS), projectPipeline: z.enum(PIPELINES), projectPlatform: z.enum(PLATFORMS) }).strict();

export function assertPackageFileName(fileName: string): void {
  const lower = fileName.toLowerCase();
  if (extname(lower) !== '.unitypackage' && !lower.endsWith('.tar.gz')) throw new DeepScanError('INVALID_PACKAGE_TYPE', 'Only .unitypackage and .tar.gz Unity packages are accepted.', 415);
}

export function assertPackageSize(sizeBytes: number, maximumBytes: number): void {
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1) throw new DeepScanError('PACKAGE_EMPTY', 'The uploaded package is empty.', 400);
  if (sizeBytes > maximumBytes) throw new DeepScanError('PACKAGE_TOO_LARGE', 'This package is larger than the current Deep Scan limit.', 413);
}

export async function assertGzipArchive(filePath: string): Promise<void> {
  const handle = await open(filePath, 'r');
  try {
    const bytes = Buffer.alloc(2);
    const { bytesRead } = await handle.read(bytes, 0, 2, 0);
    if (bytesRead !== 2) throw new DeepScanError('PACKAGE_EMPTY', 'The uploaded package is empty.', 400);
    if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) throw new DeepScanError('INVALID_PACKAGE_TYPE', 'The uploaded file is not a gzip-compressed Unity package.', 415);
  } finally { await handle.close(); }
}
