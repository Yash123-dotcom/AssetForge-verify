import { createReadStream } from 'node:fs';
import { extname } from 'node:path';
import { createGunzip } from 'node:zlib';
import { extract, type ExtractEvents, type Header } from 'tar-stream';
import { randomUUID } from 'node:crypto';
import { ArchiveBudget, assertNotNestedArchive, assertSafeEntry, safeArchivePath } from '../security/archive-safety.js';
import { deepScanLimits } from '../security/file-limits.js';
import { DeepScanError } from '../lib/errors.js';
import { DeepScanFile, DeepScanResult, DependencySignal } from '../types/deep-scan.types.js';
import { Pipeline } from '../types/verify.types.js';
import { classifyDeepScanFile, isBoundedTextCategory } from './file-classifier.js';
import { inspectScript } from './script.parser.js';
import { inspectShader } from './shader.parser.js';
import { inspectMaterial } from './material.parser.js';
import { inspectPackageManifest } from './package-manifest.parser.js';
import { detectDependencies } from './dependency.parser.js';
import { isDocumentationPath } from './documentation.parser.js';
import { inspectUnityMetadata } from './unity-meta.parser.js';

type EntryStream = ExtractEvents['entry'][1];
type EntryHandler = (header: Header, stream: EntryStream) => Promise<void>;

async function walkArchive(filePath: string, handler: EntryHandler, signal?: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const source = createReadStream(filePath); const gzip = createGunzip(); const archive = extract();
    let failed = false;
    const fail = (error: unknown) => {
      if (failed) return; failed = true;
      const safeError = error instanceof DeepScanError ? error : new DeepScanError('ARCHIVE_EXTRACTION_FAILED', 'The package archive could not be inspected.', 422);
      signal?.removeEventListener('abort', abort);
      source.destroy(); gzip.destroy(); archive.destroy(); reject(safeError);
    };
    const abort = () => fail(new DeepScanError('SCAN_TIMEOUT', 'Deep Scan took too long to complete.', 504));
    if (signal?.aborted) { abort(); return; }
    signal?.addEventListener('abort', abort, { once: true });
    source.once('error', fail); gzip.once('error', fail); archive.once('error', fail);
    archive.on('entry', (header, stream, next) => {
      void handler(header, stream).then(() => next()).catch(fail);
    });
    archive.once('finish', () => { signal?.removeEventListener('abort', abort); if (!failed) resolve(); });
    source.pipe(gzip).pipe(archive);
  });
}

async function readBounded(stream: EntryStream, maximum: number): Promise<string> {
  const chunks: Buffer[] = []; let retained = 0;
  for await (const chunkValue of stream) {
    const chunk = Buffer.isBuffer(chunkValue) ? chunkValue : typeof chunkValue === 'string' ? Buffer.from(chunkValue) : Buffer.from(chunkValue as unknown as Uint8Array);
    if (retained < maximum) { const slice = chunk.subarray(0, maximum - retained); chunks.push(slice); retained += slice.length; }
  }
  return Buffer.concat(chunks, retained).toString('utf8').replace(/\0/g, '');
}

function addScores(target: Record<Pipeline, number>, addition: Record<Pipeline, number>) {
  (Object.keys(target) as Pipeline[]).forEach((pipeline) => { target[pipeline] = (target[pipeline] ?? 0) + (addition[pipeline] ?? 0); });
}

export async function parseUnityPackage(filePath: string, fileName: string, compressedBytes: number, signal?: AbortSignal): Promise<{ result: DeepScanResult; files: DeepScanFile[]; signalScores: Record<Pipeline, number> }> {
  const limits = deepScanLimits(); const budget = new ArchiveBudget(compressedBytes, limits);
  const logicalPaths = new Map<string, string>(); const assetSizes = new Map<string, number>();

  await walkArchive(filePath, async (header, stream) => {
    const archivePath = assertSafeEntry(header.name, header.type);
    if (header.type === 'directory') { stream.resume(); return; }
    budget.observeFile(header.size ?? 0);
    const [guid, entryName] = archivePath.split('/');
    if (!guid || !entryName) { stream.resume(); return; }
    if (entryName === 'pathname') {
      const pathname = safeArchivePath((await readBounded(stream, 4096)).trim());
      assertNotNestedArchive(pathname); logicalPaths.set(guid, pathname);
    } else { if (entryName === 'asset') assetSizes.set(guid, header.size ?? 0); stream.resume(); }
  }, signal);

  const fileByGuid = new Map(Array.from(logicalPaths, ([guid, path]) => [guid, { path, extension: extname(path).toLowerCase(), size: assetSizes.get(guid) ?? 0, category: classifyDeepScanFile(path) } satisfies DeepScanFile]));
  const files = [...fileByGuid.values()];
  const composition = { scripts: 0, shaders: 0, materials: 0, textures: 0, prefabs: 0, scenes: 0, models: 0, audio: 0, documentationFiles: 0 };
  const signalScores: Record<Pipeline, number> = { BUILT_IN: 0, URP: 0, HDRP: 0 };
  const dependencies: DependencySignal[] = []; const packages = new Set<string>(); const technologies = new Set<string>(); const versionHints = new Set<string>(); const findings = new Set<string>();
  let asmdefPresent = false; let dllPresent = false; let malformedMetadata = false;

  for (const file of files) {
    if (file.category === 'SCRIPT') composition.scripts += 1;
    if (file.category === 'SHADER') composition.shaders += 1;
    if (file.category === 'MATERIAL') composition.materials += 1;
    if (file.category === 'TEXTURE') composition.textures += 1;
    if (file.category === 'PREFAB') composition.prefabs += 1;
    if (file.category === 'SCENE') composition.scenes += 1;
    if (file.category === 'MODEL') composition.models += 1;
    if (file.category === 'AUDIO') composition.audio += 1;
    if (file.category === 'DOCUMENTATION' || isDocumentationPath(file.path)) composition.documentationFiles += 1;
    if (file.extension === '.asmdef') asmdefPresent = true;
    if (file.extension === '.dll') dllPresent = true;
  }

  await walkArchive(filePath, async (header, stream) => {
    const archivePath = assertSafeEntry(header.name, header.type);
    if (header.type === 'directory') { stream.resume(); return; }
    const [guid, entryName] = archivePath.split('/');
    if (!guid) { stream.resume(); return; }
    const logicalPath = logicalPaths.get(guid);
    if (!logicalPath) { stream.resume(); return; }
    const file = fileByGuid.get(guid);
    const inspectMeta = entryName === 'asset.meta'; const inspectAsset = entryName === 'asset' && file && isBoundedTextCategory(file.category, file.extension);
    if (!inspectMeta && !inspectAsset) { stream.resume(); return; }
    const text = await readBounded(stream, limits.maxTextReadBytes);
    if (inspectMeta) { inspectUnityMetadata(text).forEach((hint) => versionHints.add(hint)); return; }
    if (!file) return;
    if (file.category === 'SCRIPT') {
      const signals = inspectScript(text, file.path); addScores(signalScores, signals.pipelineScores); dependencies.push(...signals.dependencies); signals.findings.forEach((item) => findings.add(item)); signals.unityVersionHints.forEach((hint) => versionHints.add(hint));
    } else if (file.category === 'SHADER') {
      const signals = inspectShader(text, file.path); addScores(signalScores, signals.pipelineScores); signals.technologies.forEach((item) => technologies.add(item)); signals.findings.forEach((item) => findings.add(item));
    } else if (file.category === 'MATERIAL') {
      addScores(signalScores, inspectMaterial(text).pipelineScores);
    } else if (file.category === 'PACKAGE_METADATA') {
      const manifest = inspectPackageManifest(text, file.path); manifest.packages.forEach((item) => packages.add(item)); dependencies.push(...manifest.dependencies); malformedMetadata ||= manifest.malformed;
      dependencies.push(...detectDependencies(text, file.path, 'MEDIUM'));
    } else if (file.category === 'DOCUMENTATION') dependencies.push(...detectDependencies(text, file.path, 'LOW'));
  }, signal);

  if (malformedMetadata) findings.add('Malformed package metadata was ignored.');
  const pipelineSignals = (Object.entries(signalScores) as Array<[Pipeline, number]>).filter(([, score]) => score >= 2).map(([pipeline]) => pipeline);
  const uniqueDependencies = Array.from(new Map(dependencies.map((item) => [item.name, item])).values());
  const highestPipelineScore = Math.max(...Object.values(signalScores));
  const totals = budget.totals();
  const result: DeepScanResult = {
    scanId: randomUUID(), package: { fileName, sizeBytes: compressedBytes, totalFiles: files.length, totalExtractedBytes: totals.extractedBytes }, composition,
    detected: { pipelineSignals, dependencies: uniqueDependencies.map((item) => item.name), dependencySignals: uniqueDependencies, packages: [...packages], shaderTechnologies: [...technologies], unityVersionHints: [...versionHints], findings: [...findings], documentationPresent: composition.documentationFiles > 0, asmdefPresent, dllPresent },
    risks: [], confidence: { pipeline: highestPipelineScore >= 4 ? 'HIGH' : highestPipelineScore >= 2 ? 'MEDIUM' : 'LOW', dependencies: uniqueDependencies.some((item) => item.confidence === 'HIGH') ? 'HIGH' : uniqueDependencies.length ? 'MEDIUM' : 'LOW', unityVersion: versionHints.size > 0 ? 'MEDIUM' : 'LOW' },
  };
  return { result, files, signalScores };
}
