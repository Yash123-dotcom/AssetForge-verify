import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UploadedPackage } from '../upload/package-upload.service.js';

const state = vi.hoisted(() => ({ available: 1, reserved: 0, consumed: 0, released: 0, scanFails: false, finalizeFails: false }));

vi.mock('../repositories/account.repository.js', () => ({
  reserveCredit: vi.fn(async () => {
    if (state.available < 1) throw new Error('INSUFFICIENT_CREDITS');
    state.available -= 1; state.reserved += 1;
    return { reservationId: '00000000-0000-4000-8000-000000000011', availableCredits: state.available, status: 'RESERVED' };
  }),
  finalizeCredit: vi.fn(async () => {
    if (state.finalizeFails) throw new Error('FINALIZE_FAILED');
    state.reserved -= 1; state.consumed += 1; return state.available;
  }),
  releaseCredit: vi.fn(async () => { state.reserved -= 1; state.available += 1; state.released += 1; return state.available; }),
}));

vi.mock('./deep-scan.service.js', () => ({
  runDeepScan: vi.fn(async () => {
    if (state.scanFails) throw new Error('SCAN_FAILED');
    return { scanId: '00000000-0000-4000-8000-000000000012', scan: {}, report: { id: '00000000-0000-4000-8000-000000000013' } };
  }),
}));

const { runPaidDeepScan } = await import('./paid-deep-scan.service.js');
const upload = { idempotencyKey: '00000000-0000-4000-8000-000000000014' } as UploadedPackage;

beforeEach(() => { state.available = 1; state.reserved = 0; state.consumed = 0; state.released = 0; state.scanFails = false; state.finalizeFails = false; });

describe('paid Deep Scan credit lifecycle', () => {
  it('atomically reserves and consumes exactly one credit after a successful scan', async () => {
    const result = await runPaidDeepScan(upload, 'user-1');
    expect(result.availableCredits).toBe(0);
    expect(state).toMatchObject({ available: 0, reserved: 0, consumed: 1, released: 0 });
  });

  it('does not start a scan when the user has zero credits', async () => {
    state.available = 0;
    await expect(runPaidDeepScan(upload, 'user-1')).rejects.toThrow('INSUFFICIENT_CREDITS');
    expect(state).toMatchObject({ available: 0, reserved: 0, consumed: 0 });
  });

  it('releases the reservation when static inspection fails', async () => {
    state.scanFails = true;
    await expect(runPaidDeepScan(upload, 'user-1')).rejects.toThrow('SCAN_FAILED');
    expect(state).toMatchObject({ available: 1, reserved: 0, consumed: 0, released: 1 });
  });

  it('releases the reservation when finalization fails', async () => {
    state.finalizeFails = true;
    await expect(runPaidDeepScan(upload, 'user-1')).rejects.toThrow('FINALIZE_FAILED');
    expect(state).toMatchObject({ available: 1, reserved: 0, consumed: 0, released: 1 });
  });
});
