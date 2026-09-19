import { PersistenceError } from '../lib/errors.js';
import { getSupabase } from '../lib/supabase.js';
import { DeepScanResult } from '../types/deep-scan.types.js';

type DeepScanRow = {
  id: string; package_file_name: string; package_size_bytes: number; total_files: number; total_extracted_bytes: number;
  composition: DeepScanResult['composition']; detected: DeepScanResult['detected']; risks: DeepScanResult['risks']; confidence: DeepScanResult['confidence'];
};

function fromRow(row: DeepScanRow): DeepScanResult {
  return { scanId: row.id, package: { fileName: row.package_file_name, sizeBytes: Number(row.package_size_bytes), totalFiles: row.total_files, totalExtractedBytes: Number(row.total_extracted_bytes) }, composition: row.composition, detected: row.detected, risks: row.risks, confidence: row.confidence };
}

export async function createDeepScan(reportId: string, scan: DeepScanResult, userId?: string, reservationId?: string): Promise<void> {
  const { error } = await getSupabase().from('deep_scans').insert({ id: scan.scanId, report_id: reportId, user_id: userId ?? null, credit_reservation_id: reservationId ?? null, package_file_name: scan.package.fileName, package_size_bytes: scan.package.sizeBytes, total_files: scan.package.totalFiles, total_extracted_bytes: scan.package.totalExtractedBytes, composition: scan.composition, detected: scan.detected, risks: scan.risks, confidence: scan.confidence });
  if (error) throw new PersistenceError('The Deep Scan result could not be saved.');
}

export async function findDeepScanByReportId(reportId: string): Promise<DeepScanResult | null> {
  const { data, error } = await getSupabase().from('deep_scans').select('*').eq('report_id', reportId).maybeSingle<DeepScanRow>();
  if (error) throw new PersistenceError('The Deep Scan result could not be loaded.');
  return data ? fromRow(data) : null;
}
