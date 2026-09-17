import { getSupabase } from '../lib/supabase.js';
import { PersistenceError } from '../lib/errors.js';
import { CheckResult, Risk, VerificationReport, VerifyRequest, VerifyResponse } from '../types/verify.types.js';
import { normalizeAssetName, normalizeAssetUrl, normalizeUnityGeneration } from '../lib/normalization.js';
import { findDeepScanByReportId } from './deep-scan.repository.js';

type ReportRow = {
  id: string;
  score: number;
  risk: Risk;
  summary: string;
  project_unity_version: VerifyRequest['project']['unityVersion'];
  project_pipeline: VerifyRequest['project']['pipeline'];
  project_platform: VerifyRequest['project']['platform'];
  asset_unity_version: VerifyRequest['asset']['testedUnityVersion'];
  asset_pipeline: VerifyRequest['asset']['pipeline'];
  custom_shaders: boolean;
  dependencies: string[];
  checks: CheckResult[];
  recommendations: string[];
  created_at: string;
  asset_name: string | null;
  asset_publisher: string | null;
  asset_source_url: string | null;
  asset_source: 'UNITY_ASSET_STORE' | 'UPLOADED_PACKAGE' | null;
  asset_metadata_source: 'URL_ANALYSIS' | 'MANUAL' | 'USER' | 'PACKAGE_SCAN' | null;
  asset_field_confidence?: NonNullable<VerifyRequest['asset']['metadata']>['fieldConfidence'] | null;
  schema_version?: string | null;
  is_demo?: boolean | null;
};

export function withLegacySeverity(check: CheckResult): CheckResult {
  if (check.severity) return check;
  const severity = check.status === 'FAIL' ? (check.id === 'pipeline' ? 'CRITICAL' : 'HIGH') : check.status === 'WARNING' ? 'MEDIUM' : 'INFO';
  return { ...check, severity };
}

function toReport(row: ReportRow): VerificationReport {
  return {
    id: row.id,
    score: row.score,
    risk: row.risk,
    summary: row.summary,
    project: { unityVersion: row.project_unity_version, pipeline: row.project_pipeline, platform: row.project_platform },
    asset: { testedUnityVersion: row.asset_unity_version, pipeline: row.asset_pipeline, customShaders: row.custom_shaders, dependencies: row.dependencies },
    checks: row.checks.map(withLegacySeverity),
    recommendations: row.recommendations,
    createdAt: row.created_at,
    metadata: row.asset_name || row.asset_publisher || row.asset_source_url ? { assetName: row.asset_name ?? undefined, publisherName: row.asset_publisher ?? undefined, sourceUrl: row.asset_source_url ?? undefined, source: row.asset_source ?? undefined, metadataSource: row.asset_metadata_source ?? undefined, fieldConfidence: row.asset_field_confidence ?? undefined } : undefined,
  };
}

export async function createReport(input: VerifyRequest, result: VerifyResponse): Promise<VerificationReport> {
  const { data, error } = await getSupabase().from('verification_reports').insert({
    score: result.score,
    risk: result.risk,
    summary: result.summary,
    project_unity_version: input.project.unityVersion,
    project_pipeline: input.project.pipeline,
    project_platform: input.project.platform,
    asset_unity_version: input.asset.testedUnityVersion,
    asset_pipeline: input.asset.pipeline,
    custom_shaders: input.asset.customShaders,
    dependencies: input.asset.dependencies,
    checks: result.checks,
    recommendations: result.recommendations,
    asset_name: input.asset.metadata?.assetName ?? null,
    asset_publisher: input.asset.metadata?.publisherName ?? null,
    asset_source_url: input.asset.metadata?.sourceUrl ?? null,
    asset_source: input.asset.metadata?.source ?? null,
    asset_metadata_source: input.asset.metadata?.metadataSource ?? null,
    asset_field_confidence: input.asset.metadata?.fieldConfidence ?? {},
    project_unity_generation: normalizeUnityGeneration(input.project.unityVersion),
    asset_unity_generation: normalizeUnityGeneration(input.asset.testedUnityVersion),
    asset_url_normalized: normalizeAssetUrl(input.asset.metadata?.sourceUrl),
    asset_name_normalized: normalizeAssetName(input.asset.metadata?.assetName),
    schema_version: '0.6',
    is_demo: false,
  }).select('*').single<ReportRow>();

  if (error || !data) throw new PersistenceError('The report could not be saved.');
  return toReport(data);
}

export async function findReportById(id: string): Promise<VerificationReport | null> {
  const { data, error } = await getSupabase().from('verification_reports').select('*').eq('id', id).maybeSingle<ReportRow>();
  if (error) throw new PersistenceError('The report could not be loaded.');
  if (!data) return null;
  const report = toReport(data);
  const deepScan = await findDeepScanByReportId(id);
  return deepScan ? { ...report, deepScan } : report;
}
