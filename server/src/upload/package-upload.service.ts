import Busboy from 'busboy';
import { createWriteStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Request } from 'express';
import { DeepScanError } from '../lib/errors.js';
import { DeepScanProject } from '../types/deep-scan.types.js';
import { deepScanLimits } from '../security/file-limits.js';
import { assertGzipArchive, assertPackageFileName, assertPackageSize, deepScanProjectSchema } from '../security/upload-validator.js';
import { cleanupScanTempDirectory, createScanTempDirectory } from './temp-storage.service.js';

export type UploadedPackage = { directory: string; path: string; fileName: string; sizeBytes: number; project: DeepScanProject; idempotencyKey: string };

export async function receivePackageUpload(request: Request): Promise<UploadedPackage> {
  if (!request.headers['content-type']?.toLowerCase().startsWith('multipart/form-data')) throw new DeepScanError('INVALID_UPLOAD', 'Deep Scan requires a multipart package upload.', 415);
  const limits = deepScanLimits();
  const directory = await createScanTempDirectory();
  const path = join(directory, 'package.upload');
  const fields: Record<string, string> = {};
  const allowedFields = new Set(['projectUnityVersion', 'projectPipeline', 'projectPlatform', 'idempotencyKey']);
  let fileName = ''; let fileSeen = false; let uploadError: Error | null = null; let writePromise: Promise<void> | null = null;
  try {
    await new Promise<void>((resolve, reject) => {
      let parser: ReturnType<typeof Busboy>;
      try { parser = Busboy({ headers: request.headers, limits: { files: 1, fields: 5, parts: 6, fileSize: limits.maxPackageBytes, fieldSize: 200 } }); }
      catch { reject(new DeepScanError('INVALID_UPLOAD', 'The multipart upload could not be read.', 400)); return; }
      parser.on('file', (fieldName, stream, info) => {
        if (fieldName !== 'file' || fileSeen) { stream.resume(); uploadError = new DeepScanError('INVALID_UPLOAD', 'Upload exactly one package file.', 400); return; }
        fileSeen = true; fileName = basename(info.filename.replace(/\\/g, '/'));
        try { assertPackageFileName(fileName); }
        catch (error) { uploadError = error as Error; stream.resume(); return; }
        stream.once('limit', () => { uploadError = new DeepScanError('PACKAGE_TOO_LARGE', 'This package is larger than the current Deep Scan limit.', 413); });
        writePromise = pipeline(stream, createWriteStream(path));
      });
      parser.on('field', (name, value) => {
        if (!allowedFields.has(name) || Object.hasOwn(fields, name)) {
          uploadError = new DeepScanError('INVALID_UPLOAD', 'The upload contains an unexpected or duplicate project field.', 400);
          return;
        }
        fields[name] = value;
      });
      parser.once('filesLimit', () => { uploadError = new DeepScanError('INVALID_UPLOAD', 'Upload exactly one package file.', 400); });
      parser.once('fieldsLimit', () => { uploadError = new DeepScanError('INVALID_UPLOAD', 'The upload contains too many project fields.', 400); });
      parser.once('partsLimit', () => { uploadError = new DeepScanError('INVALID_UPLOAD', 'The upload contains too many multipart sections.', 400); });
      parser.once('error', () => reject(new DeepScanError('INVALID_UPLOAD', 'The multipart upload could not be read.', 400)));
      parser.once('close', resolve);
      request.pipe(parser);
    });
    if (writePromise) await writePromise;
    if (uploadError) throw uploadError;
    if (!fileSeen || !writePromise) throw new DeepScanError('INVALID_UPLOAD', 'Choose a Unity package to scan.', 400);
    const details = await stat(path);
    assertPackageSize(details.size, limits.maxPackageBytes);
    await assertGzipArchive(path);
    const parsed = deepScanProjectSchema.safeParse({ projectUnityVersion: fields.projectUnityVersion, projectPipeline: fields.projectPipeline, projectPlatform: fields.projectPlatform });
    if (!parsed.success) throw new DeepScanError('INVALID_PROJECT_SETUP', 'Choose a valid Unity version, render pipeline, and platform.', 400);
    const idempotencyKey = fields.idempotencyKey;
    if (!idempotencyKey || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) throw new DeepScanError('INVALID_IDEMPOTENCY_KEY', 'Start a new Deep Scan request and try again.', 400);
    return { directory, path, fileName, sizeBytes: details.size, project: { unityVersion: parsed.data.projectUnityVersion, pipeline: parsed.data.projectPipeline, platform: parsed.data.projectPlatform }, idempotencyKey };
  } catch (error) {
    await cleanupScanTempDirectory(directory).catch(() => undefined);
    throw error;
  }
}
