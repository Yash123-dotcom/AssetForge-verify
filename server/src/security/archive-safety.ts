import { DeepScanError } from '../lib/errors.js';
import { deepScanLimits } from './file-limits.js';

const drivePath = /^[a-zA-Z]:[\\/]/;
const nestedArchive = /\.(?:zip|rar|7z|tar|tgz|gz|bz2|xz|unitypackage)$/i;

export function safeArchivePath(input: string): string {
  const hasControlCharacter = Array.from(input).some((character) => character.charCodeAt(0) < 32);
  if (!input || input.length > 1024 || hasControlCharacter) throw new DeepScanError('ARCHIVE_UNSAFE', 'The package contains an unsafe file name.', 422);
  const normalized = input.replace(/\\/g, '/');
  if (normalized.startsWith('/') || drivePath.test(input) || normalized.split('/').includes('..')) throw new DeepScanError('ARCHIVE_UNSAFE', 'The package contains an unsafe path.', 422);
  const safe = normalized.replace(/^\.\//, '').replace(/\/+/g, '/');
  if (!safe || safe === '.' || safe.split('/').some((segment) => segment === '.' || segment.length === 0)) throw new DeepScanError('ARCHIVE_UNSAFE', 'The package contains an unsafe path.', 422);
  return safe;
}

export function assertSafeEntry(name: string, type: string | null | undefined): string {
  const safeName = safeArchivePath(name);
  const allowedTypes = new Set(['file', 'directory', null, undefined]);
  if (!allowedTypes.has(type)) throw new DeepScanError('ARCHIVE_UNSAFE', 'Links and special archive entries are not allowed.', 422);
  return safeName;
}

export function assertNotNestedArchive(path: string): void {
  if (nestedArchive.test(path)) throw new DeepScanError('ARCHIVE_UNSAFE', 'Nested archives are not inspected.', 422);
}

export class ArchiveBudget {
  private fileCount = 0;
  private extractedBytes = 0;
  constructor(private readonly compressedBytes: number, private readonly limits = deepScanLimits()) {}

  observeFile(size: number): void {
    if (!Number.isSafeInteger(size) || size < 0) throw new DeepScanError('ARCHIVE_UNSAFE', 'The package contains an invalid file size.', 422);
    this.fileCount += 1;
    if (this.fileCount > this.limits.maxArchiveFiles) throw new DeepScanError('ARCHIVE_TOO_MANY_FILES', 'The package contains too many files.', 422);
    if (size > this.limits.maxSingleFileBytes) throw new DeepScanError('ARCHIVE_TOO_LARGE', 'The package contains a file above the per-file limit.', 422);
    this.extractedBytes += size;
    if (this.extractedBytes > this.limits.maxExtractedBytes) throw new DeepScanError('ARCHIVE_TOO_LARGE', 'The extracted package exceeds the Deep Scan limit.', 422);
    if (this.extractedBytes / Math.max(this.compressedBytes, 1) > this.limits.maxCompressionRatio) throw new DeepScanError('ARCHIVE_UNSAFE', 'The package has a suspicious compression ratio.', 422);
  }

  totals() { return { archiveEntries: this.fileCount, extractedBytes: this.extractedBytes }; }
}
