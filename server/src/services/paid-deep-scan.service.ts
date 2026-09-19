import { finalizeCredit, releaseCredit, reserveCredit } from '../repositories/account.repository.js';
import { UploadedPackage } from '../upload/package-upload.service.js';
import { runDeepScan } from './deep-scan.service.js';

export async function runPaidDeepScan(upload: UploadedPackage, userId: string) {
  const reservation = await reserveCredit(userId, upload.idempotencyKey);
  let finalized = false;
  try {
    const result = await runDeepScan(upload, userId, reservation.reservationId);
    const availableCredits = await finalizeCredit(userId, reservation.reservationId, result.report.id);
    finalized = true;
    return { ...result, availableCredits };
  } catch (error) {
    if (!finalized) await releaseCredit(userId, reservation.reservationId, error instanceof Error ? error.message : 'scan failure').catch(() => undefined);
    throw error;
  }
}
