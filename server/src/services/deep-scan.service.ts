import { basename } from 'node:path';
import * as deepScanRepository from '../repositories/deep-scan.repository.js';
import * as reportRepository from '../repositories/report.repository.js';
import { deepScanLimits } from '../security/file-limits.js';
import { parseUnityPackage } from '../parsers/unitypackage.parser.js';
import { DeepScanProject, DeepScanResponse, DeepScanResult } from '../types/deep-scan.types.js';
import { Pipeline, UnityVersion, VerifyRequest } from '../types/verify.types.js';
import { UploadedPackage } from '../upload/package-upload.service.js';
import { verifyCompatibility } from './verification.service.js';

const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 } as const;

function generationFromHints(hints: string[]): UnityVersion | null {
  if (hints.some((hint) => hint.startsWith('6000'))) return '6000';
  if (hints.some((hint) => hint.startsWith('2023'))) return '2023';
  if (hints.some((hint) => hint.startsWith('2022'))) return '2022';
  if (hints.some((hint) => hint.startsWith('2021'))) return '2021';
  return null;
}

function buildRisks(scan: DeepScanResult, project: DeepScanProject) {
  const risks: DeepScanResult['risks'] = [];
  if (scan.detected.pipelineSignals.length > 1) risks.push({ id: 'mixed-pipeline', category: 'PIPELINE', severity: 'HIGH', title: 'Mixed render pipeline signals', message: `The package contains signals for ${scan.detected.pipelineSignals.join(' and ')}.`, recommendation: 'Confirm which pipeline the included scenes and materials target.' });
  else if (scan.detected.pipelineSignals.length === 1 && scan.detected.pipelineSignals[0] !== project.pipeline) risks.push({ id: 'pipeline-mismatch', category: 'PIPELINE', severity: 'CRITICAL', title: 'Render pipeline mismatch', message: `Package evidence points to ${scan.detected.pipelineSignals[0]}, while the project uses ${project.pipeline}.`, recommendation: 'Plan for material and shader conversion before using the asset.' });
  else if (scan.detected.pipelineSignals[0] === project.pipeline) risks.push({ id: 'pipeline-match', category: 'PIPELINE', severity: 'INFO', title: 'Matching pipeline evidence', message: `Direct package signals match the project's ${project.pipeline} pipeline.` });
  if (scan.composition.shaders > 0) risks.push({ id: 'custom-shaders', category: 'SHADER', severity: scan.detected.pipelineSignals.length === 1 && scan.detected.pipelineSignals[0] !== project.pipeline ? 'HIGH' : 'MEDIUM', title: 'Custom shaders detected', message: `Deep Scan detected ${scan.composition.shaders} shader ${scan.composition.shaders === 1 ? 'file' : 'files'}.`, recommendation: 'Inspect shader and material rendering in a backup project.' });
  if (scan.detected.dependencies.length >= 3) risks.push({ id: 'multiple-dependencies', category: 'DEPENDENCY', severity: 'MEDIUM', title: 'Multiple external dependencies', message: `${scan.detected.dependencies.length} dependency signals were detected.`, recommendation: 'Confirm compatible package versions before import.' });
  if (scan.detected.dllPresent) risks.push({ id: 'precompiled-dll', category: 'BINARY', severity: 'MEDIUM', title: 'Precompiled DLLs detected', message: 'The package contains precompiled plugins that were not executed or loaded.', recommendation: 'Confirm target-platform and Unity-version support with the publisher.' });
  if (scan.detected.findings.includes('UnityEditor references detected.')) risks.push({ id: 'unity-editor-code', category: 'SCRIPT', severity: 'LOW', title: 'UnityEditor references detected', message: 'Some scripts use editor-only Unity APIs.', recommendation: 'Confirm editor code is kept out of runtime assemblies.' });
  if (scan.detected.findings.includes('Legacy Unity API indicators detected.')) risks.push({ id: 'legacy-api', category: 'VERSION', severity: 'HIGH', title: 'Legacy API indicators', message: 'Static script inspection found APIs commonly associated with older Unity versions.', recommendation: 'Test compilation in a backup project and review console errors.' });
  risks.push(scan.detected.documentationPresent
    ? { id: 'documentation', category: 'DOCUMENTATION', severity: 'INFO', title: 'Documentation files detected', message: 'The package contains apparent setup or documentation files.' }
    : { id: 'documentation', category: 'DOCUMENTATION', severity: 'INFO', title: 'No obvious setup documentation', message: 'No README, setup guide, or docs folder was detected.', recommendation: 'Check the publisher documentation before import.' });
  return risks.sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity]);
}

function reportInput(scan: DeepScanResult, project: DeepScanProject): VerifyRequest {
  const detectedPipeline: Pipeline | null = scan.detected.pipelineSignals.length === 1 ? (scan.detected.pipelineSignals[0] ?? null) : null;
  const detectedVersion = generationFromHints(scan.detected.unityVersionHints);
  return {
    project,
    asset: {
      testedUnityVersion: detectedVersion ?? project.unityVersion,
      pipeline: detectedPipeline ?? project.pipeline,
      customShaders: scan.composition.shaders > 0,
      dependencies: scan.detected.dependencies.slice(0, 30),
      metadata: {
        assetName: basename(scan.package.fileName).replace(/\.(?:unitypackage|tar\.gz)$/i, '').slice(0, 200),
        source: 'UPLOADED_PACKAGE', metadataSource: 'PACKAGE_SCAN',
        fieldConfidence: { unityVersion: detectedVersion ? 'PACKAGE' : 'UNKNOWN', pipeline: detectedPipeline ? 'PACKAGE' : 'UNKNOWN', dependencies: scan.detected.dependencies.length ? 'PACKAGE' : 'UNKNOWN', shaders: 'PACKAGE' },
      },
    },
  };
}

export async function runDeepScan(upload: UploadedPackage, userId?: string, reservationId?: string): Promise<DeepScanResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), deepScanLimits().scanTimeoutMs);
  const parsed = await parseUnityPackage(upload.path, upload.fileName, upload.sizeBytes, controller.signal).finally(() => clearTimeout(timeout));
  parsed.result.risks = buildRisks(parsed.result, upload.project);
  const input = reportInput(parsed.result, upload.project);
  const verification = verifyCompatibility(input, { dllPresent: parsed.result.detected.dllPresent, documentationPresent: parsed.result.detected.documentationPresent });
  const report = await reportRepository.createReport(input, verification, userId);
  await deepScanRepository.createDeepScan(report.id, parsed.result, userId, reservationId);
  return { scanId: parsed.result.scanId, scan: parsed.result, report: { ...report, deepScan: parsed.result } };
}
