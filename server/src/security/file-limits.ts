function positiveNumber(name: string, fallback: number, maximum: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > maximum) throw new Error(`${name} must be greater than 0 and no more than ${maximum}.`);
  return parsed;
}

export function deepScanLimits() {
  const mb = 1024 * 1024;
  return {
    maxPackageBytes: Math.floor(positiveNumber('MAX_PACKAGE_SIZE_MB', 250, 1000) * mb),
    maxExtractedBytes: Math.floor(positiveNumber('MAX_EXTRACTED_SIZE_MB', 1000, 5000) * mb),
    maxArchiveFiles: Math.floor(positiveNumber('MAX_ARCHIVE_FILES', 20000, 100000)),
    maxCompressionRatio: positiveNumber('MAX_COMPRESSION_RATIO', 50, 200),
    maxSingleFileBytes: Math.floor(positiveNumber('MAX_SINGLE_FILE_SIZE_MB', 100, 1000) * mb),
    maxTextReadBytes: Math.floor(positiveNumber('MAX_TEXT_READ_MB', 1, 5) * mb),
    scanTimeoutMs: Math.floor(positiveNumber('DEEP_SCAN_TIMEOUT_SECONDS', 120, 300) * 1000),
  };
}
