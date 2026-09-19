import { createWriteStream } from 'node:fs';
import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import request from 'supertest';
import { pack } from 'tar-stream';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VerificationReport, VerifyRequest, VerifyResponse } from '../types/verify.types.js';

const persisted = vi.hoisted(() => ({ reportInput: null as VerifyRequest | null, scan: null as unknown }));

vi.mock('../middleware/auth.js', () => ({
  optionalAuth: (request: { authUser?: { id: string; email: string } }, _response: unknown, next: () => void) => { request.authUser = { id: '00000000-0000-4000-8000-000000000007', email: 'tester@example.com' }; next(); },
  requireAuth: (request: { authUser?: { id: string; email: string } }, _response: unknown, next: () => void) => { request.authUser = { id: '00000000-0000-4000-8000-000000000007', email: 'tester@example.com' }; next(); },
}));

vi.mock('../repositories/account.repository.js', () => ({
  reserveCredit: vi.fn(async () => ({ reservationId: '00000000-0000-4000-8000-000000000008', availableCredits: 1, status: 'RESERVED' })),
  finalizeCredit: vi.fn(async () => 0),
  releaseCredit: vi.fn(async () => 1),
  getAccountData: vi.fn(), getCreditBalance: vi.fn(), grantCredits: vi.fn(),
}));

vi.mock('../repositories/report.repository.js', () => ({
  createReport: vi.fn(async (input: VerifyRequest, result: VerifyResponse): Promise<VerificationReport> => {
    persisted.reportInput = input;
    return { ...result, id: '00000000-0000-4000-8000-000000000006', project: input.project, asset: input.asset, createdAt: new Date().toISOString() };
  }),
  findReportById: vi.fn(async () => null),
}));

vi.mock('../repositories/deep-scan.repository.js', () => ({
  createDeepScan: vi.fn(async (_reportId: string, scan: unknown) => { persisted.scan = scan; }),
  findDeepScanByReportId: vi.fn(async () => null),
}));

vi.mock('../repositories/metrics.repository.js', () => ({
  createBetaEvent: vi.fn(async () => undefined),
  loadMetricsData: vi.fn(async () => ({ events: [], reports: [], feedback: [], usefulnessCount: 0, payments: [], creditTransactions: [] })),
}));

let fixtureDirectory = '';
let fixturePath = '';
let app: Awaited<typeof import('../app.js')>['app'];
const accountRepository = await import('../repositories/account.repository.js');

async function createFixture(): Promise<void> {
  fixtureDirectory = await mkdtemp(join(tmpdir(), 'assetforge-deep-scan-e2e-'));
  fixturePath = join(fixtureDirectory, 'safe.unitypackage');
  const archive = pack();
  const writing = pipeline(archive, createGzip(), createWriteStream(fixturePath));
  archive.entry({ name: '11111111111111111111111111111111/pathname' }, 'Assets/Scripts/CameraRig.cs');
  archive.entry({ name: '11111111111111111111111111111111/asset' }, 'using UnityEngine.Rendering.Universal; using Cinemachine;');
  archive.entry({ name: '11111111111111111111111111111111/asset.meta' }, 'fileFormatVersion: 2');
  archive.entry({ name: '22222222222222222222222222222222/pathname' }, 'README.md');
  archive.entry({ name: '22222222222222222222222222222222/asset' }, '# Setup\nInstall URP first.');
  archive.entry({ name: '22222222222222222222222222222222/asset.meta' }, 'fileFormatVersion: 2');
  archive.finalize();
  await writing;
}

async function newScanTempDirectories(before: Set<string>): Promise<string[]> {
  return (await readdir(tmpdir())).filter((name) => name.startsWith('assetforge-deep-scan-') && !before.has(name));
}

async function waitForCleanup(before: Set<string>): Promise<string[]> {
  const deadline = Date.now() + 1000;
  let remaining = await newScanTempDirectories(before);
  while (remaining.length && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    remaining = await newScanTempDirectories(before);
  }
  return remaining;
}

beforeAll(async () => {
  process.env.DEEP_SCAN_ENABLED = 'true';
  await createFixture();
  ({ app } = await import('../app.js'));
});

afterAll(async () => {
  delete process.env.DEEP_SCAN_ENABLED;
  if (fixtureDirectory) await rm(fixtureDirectory, { recursive: true, force: true });
});

beforeEach(() => { vi.clearAllMocks(); persisted.scan = null; persisted.reportInput = null; });

describe('Deep Scan multipart flow', () => {
  it('uploads, statically inspects, scores, persists results, and removes its temporary upload', async () => {
    const before = new Set((await readdir(tmpdir())).filter((name) => name.startsWith('assetforge-deep-scan-')));
    const response = await request(app)
      .post('/api/deep-scan')
      .field('projectUnityVersion', '6000')
      .field('projectPipeline', 'URP')
      .field('projectPlatform', 'WINDOWS')
      .field('idempotencyKey', '00000000-0000-4000-8000-000000000009')
      .attach('file', fixturePath, 'safe.unitypackage');

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      scan: { composition: { scripts: 1, documentationFiles: 1 }, detected: { documentationPresent: true } },
      report: { project: { pipeline: 'URP' }, asset: { metadata: { source: 'UPLOADED_PACKAGE', metadataSource: 'PACKAGE_SCAN' } } },
    });
    expect(response.body.scan.detected.pipelineSignals).toContain('URP');
    expect(response.body.scan.detected.dependencies).toContain('Cinemachine');
    expect(persisted.reportInput?.asset.metadata?.fieldConfidence?.pipeline).toBe('PACKAGE');
    expect(persisted.scan).toBeTruthy();

    const after = await waitForCleanup(before);
    await Promise.all(after.map(async (name) => stat(join(tmpdir(), name))));
    expect(after).toEqual([]);
  });

  it('rejects non-package files without persisting a scan', async () => {
    persisted.scan = null;
    const response = await request(app)
      .post('/api/deep-scan')
      .field('projectUnityVersion', '6000')
      .field('projectPipeline', 'URP')
      .field('projectPlatform', 'WINDOWS')
      .field('idempotencyKey', '00000000-0000-4000-8000-000000000010')
      .attach('file', fixturePath, 'unsafe.zip');
    expect(response.status).toBe(415);
    expect(response.body.code).toBe('INVALID_PACKAGE_TYPE');
    expect(persisted.scan).toBeNull();
    expect(accountRepository.reserveCredit).not.toHaveBeenCalled();
  });
});
