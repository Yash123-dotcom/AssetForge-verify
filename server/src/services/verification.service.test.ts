import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PersistenceError } from '../lib/errors.js';
import type { FeedbackOutcome, VerificationReport, VerifyRequest, VerifyResponse } from '../types/verify.types.js';

const testState = vi.hoisted(() => ({
  reports: new Map<string, VerificationReport>(),
  feedback: new Map<string, FeedbackOutcome[]>(),
  failCreate: false,
  nextId: 0,
}));

vi.mock('../repositories/report.repository.js', () => ({
  createReport: vi.fn(async (input: VerifyRequest, result: VerifyResponse) => {
    if (testState.failCreate) throw new PersistenceError('The report could not be saved.');
    testState.nextId += 1;
    const id = `00000000-0000-4000-8000-${String(testState.nextId).padStart(12, '0')}`;
    const report: VerificationReport = { ...result, id, project: input.project, asset: input.asset, createdAt: new Date().toISOString() };
    testState.reports.set(id, report);
    return report;
  }),
  findReportById: vi.fn(async (id: string) => testState.reports.get(id) ?? null),
}));

vi.mock('../repositories/feedback.repository.js', () => ({
  createFeedback: vi.fn(async (reportId: string, outcome: FeedbackOutcome) => {
    testState.feedback.set(reportId, [...(testState.feedback.get(reportId) ?? []), outcome]);
  }),
  getFeedbackSummary: vi.fn(async (reportId: string) => {
    const outcomes = testState.feedback.get(reportId) ?? [];
    return { totalResponses: outcomes.length, worked: outcomes.filter((item) => item === 'WORKED').length, partial: outcomes.filter((item) => item === 'PARTIAL').length, failed: outcomes.filter((item) => item === 'FAILED').length };
  }),
}));

const { app } = await import('../app.js');

const base: VerifyRequest = {
  project: { unityVersion: '6000', pipeline: 'URP', platform: 'WINDOWS' },
  asset: { testedUnityVersion: '6000', pipeline: 'URP', customShaders: false, dependencies: [] },
};

async function createReport(overrides: Partial<VerifyRequest['asset']> = {}) {
  return request(app).post('/api/verify').send({ ...base, asset: { ...base.asset, ...overrides } });
}

beforeEach(() => {
  testState.reports.clear(); testState.feedback.clear(); testState.failCreate = false; testState.nextId = 0;
});

describe('persistent report flow', () => {
  it('creates, stores, and reloads a report by its public ID', async () => {
    const created = await createReport();
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ score: 100, risk: 'LOW', project: base.project, asset: base.asset });
    expect(created.body.id).toMatch(/^[0-9a-f-]{36}$/);

    const loaded = await request(app).get(`/api/reports/${created.body.id}`);
    expect(loaded.status).toBe(200);
    expect(loaded.body).toEqual(created.body);
  });

  it.each([
    ['pipeline mismatch', { pipeline: 'HDRP' as const }, 'pipeline', 'FAIL'],
    ['old Unity version', { testedUnityVersion: '2021' as const }, 'unity-version', 'FAIL'],
    ['custom shader mismatch', { pipeline: 'BUILT_IN' as const, customShaders: true }, 'shaders', 'FAIL'],
    ['many dependencies', { dependencies: ['A', 'B', 'C', 'D', 'E'] }, 'dependencies', 'WARNING'],
  ])('preserves the %s scoring behavior', async (_name, overrides, checkId, status) => {
    const response = await createReport(overrides);
    expect(response.status).toBe(201);
    expect(response.body.checks.find((check: { id: string }) => check.id === checkId).status).toBe(status);
  });

  it('returns 404 for a missing report', async () => {
    const response = await request(app).get('/api/reports/00000000-0000-4000-8000-999999999999');
    expect(response.status).toBe(404);
  });

  it('returns 400 for an invalid report ID', async () => {
    const response = await request(app).get('/api/reports/not-a-uuid');
    expect(response.status).toBe(400);
  });

  it('returns 503 when report persistence fails', async () => {
    testState.failCreate = true;
    const response = await createReport();
    expect(response.status).toBe(503);
    expect(response.body.error).toBe('The report could not be saved.');
  });
});

describe('report feedback', () => {
  it('creates feedback and returns an aggregate summary', async () => {
    const created = await createReport();
    const id = created.body.id as string;
    expect((await request(app).post(`/api/reports/${id}/feedback`).send({ outcome: 'WORKED', comment: 'Everything rendered correctly.' })).status).toBe(201);
    expect((await request(app).post(`/api/reports/${id}/feedback`).send({ outcome: 'PARTIAL' })).status).toBe(201);
    expect((await request(app).post(`/api/reports/${id}/feedback`).send({ outcome: 'FAILED' })).status).toBe(201);
    const summary = await request(app).get(`/api/reports/${id}/feedback-summary`);
    expect(summary.status).toBe(200);
    expect(summary.body).toEqual({ totalResponses: 3, worked: 1, partial: 1, failed: 1 });
  });

  it('rejects an invalid outcome', async () => {
    const created = await createReport();
    const response = await request(app).post(`/api/reports/${created.body.id}/feedback`).send({ outcome: 'MAYBE' });
    expect(response.status).toBe(400);
  });

  it('rejects comments longer than 500 characters', async () => {
    const created = await createReport();
    const response = await request(app).post(`/api/reports/${created.body.id}/feedback`).send({ outcome: 'WORKED', comment: 'x'.repeat(501) });
    expect(response.status).toBe(400);
  });
});
