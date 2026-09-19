import { Response } from 'express';
import { DeepScanError, ServiceError } from '../lib/errors.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { createBetaEvent } from '../repositories/metrics.repository.js';
import { runPaidDeepScan } from '../services/paid-deep-scan.service.js';
import { cleanupScanTempDirectory } from '../upload/temp-storage.service.js';
import { receivePackageUpload, UploadedPackage } from '../upload/package-upload.service.js';
import { sendServiceError } from './error-response.js';

export async function createDeepScan(request: AuthenticatedRequest, response: Response): Promise<void> {
  if (process.env.DEEP_SCAN_ENABLED !== 'true') {
    response.locals.errorCode = 'DEEP_SCAN_RUNTIME_UNAVAILABLE';
    response.status(503).json({ code: 'DEEP_SCAN_RUNTIME_UNAVAILABLE', error: 'Deep Scan requires the dedicated package-processing service.' });
    return;
  }
  const startedAt = performance.now(); let upload: UploadedPackage | null = null; let scanId: string | null = null;
  try {
    upload = await receivePackageUpload(request);
    await createBetaEvent('deep_scan_started').catch(() => undefined);
    const result = await runPaidDeepScan(upload, request.authUser!.id); scanId = result.scanId;
    await createBetaEvent('deep_scan_completed', Math.round(performance.now() - startedAt)).catch(() => undefined);
    await createBetaEvent('deep_scan_credit_used').catch(() => undefined);
    console.info(JSON.stringify({ scan_id: scanId, package_size: upload.sizeBytes, file_count: result.scan.package.totalFiles, duration_ms: Math.round(performance.now() - startedAt), status: 'COMPLETED', error_code: null }));
    response.status(201).json(result);
  } catch (error) {
    const code = error instanceof DeepScanError || error instanceof ServiceError ? error.code : 'INTERNAL_ERROR';
    await createBetaEvent(code === 'SCAN_TIMEOUT' ? 'deep_scan_timed_out' : 'deep_scan_failed', Math.round(performance.now() - startedAt)).catch(() => undefined);
    console.info(JSON.stringify({ scan_id: scanId, package_size: upload?.sizeBytes ?? null, file_count: null, duration_ms: Math.round(performance.now() - startedAt), status: 'FAILED', error_code: code }));
    sendServiceError(error, response);
  } finally {
    if (upload) await cleanupScanTempDirectory(upload.directory).catch(() => undefined);
  }
}
