import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArchiveBudget, assertNotNestedArchive, assertSafeEntry, safeArchivePath } from './archive-safety.js';
import { assertGzipArchive, assertPackageFileName, assertPackageSize } from './upload-validator.js';

describe('Deep Scan archive safety', () => {
  it.each(['../secret.cs', 'safe/../../secret.cs', '/absolute/path.cs', 'C:\\Windows\\file.dll', 'bad\0name.cs', './'])('rejects unsafe path %s', (path) => {
    expect(() => safeArchivePath(path)).toThrow();
  });

  it('rejects symlinks and device entries', () => {
    expect(() => assertSafeEntry('safe/link', 'symlink')).toThrow();
    expect(() => assertSafeEntry('safe/device', 'character-device')).toThrow();
  });

  it('rejects nested archives', () => {
    expect(() => assertNotNestedArchive('Assets/payload.zip')).toThrow();
    expect(() => assertNotNestedArchive('Assets/nested.unitypackage')).toThrow();
  });

  it('enforces file count, extraction, per-file, and compression-ratio budgets', () => {
    expect(() => { const budget = new ArchiveBudget(100, { maxArchiveFiles: 1, maxExtractedBytes: 1000, maxSingleFileBytes: 500, maxCompressionRatio: 50, maxPackageBytes: 1000, maxTextReadBytes: 100, scanTimeoutMs: 1000 }); budget.observeFile(1); budget.observeFile(1); }).toThrow(/too many/i);
    expect(() => new ArchiveBudget(100, { maxArchiveFiles: 10, maxExtractedBytes: 50, maxSingleFileBytes: 500, maxCompressionRatio: 50, maxPackageBytes: 1000, maxTextReadBytes: 100, scanTimeoutMs: 1000 }).observeFile(51)).toThrow(/exceeds/i);
    expect(() => new ArchiveBudget(100, { maxArchiveFiles: 10, maxExtractedBytes: 1000, maxSingleFileBytes: 50, maxCompressionRatio: 50, maxPackageBytes: 1000, maxTextReadBytes: 100, scanTimeoutMs: 1000 }).observeFile(51)).toThrow(/per-file/i);
    expect(() => new ArchiveBudget(1, { maxArchiveFiles: 10, maxExtractedBytes: 1000, maxSingleFileBytes: 1000, maxCompressionRatio: 50, maxPackageBytes: 1000, maxTextReadBytes: 100, scanTimeoutMs: 1000 }).observeFile(51)).toThrow(/compression ratio/i);
  });

  it('rejects fake extensions and zero-byte files', async () => {
    expect(() => assertPackageFileName('asset.zip')).toThrow();
    expect(() => assertPackageSize(251, 250)).toThrow(/larger/i);
    const directory = await mkdtemp(join(tmpdir(), 'assetforge-safety-test-')); const empty = join(directory, 'empty.unitypackage');
    try { await writeFile(empty, Buffer.alloc(0)); await expect(assertGzipArchive(empty)).rejects.toThrow(/empty/i); }
    finally { await rm(directory, { recursive: true, force: true }); }
  });
});
