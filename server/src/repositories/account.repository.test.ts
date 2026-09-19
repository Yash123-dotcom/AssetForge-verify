import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('../lib/supabase.js', () => ({ getSupabase: () => ({ rpc }) }));
const { finalizeCredit, releaseCredit, reserveCredit } = await import('./account.repository.js');

beforeEach(() => rpc.mockReset());

describe('credit repository atomic RPC boundary', () => {
  it('returns a newly reserved credit and remaining balance', async () => {
    rpc.mockResolvedValue({ data: [{ reservation_id: 'reservation-1', reservation_status: 'RESERVED', available_credits: 2, reservation_created: true }], error: null });
    await expect(reserveCredit('user-1', '00000000-0000-4000-8000-000000000016')).resolves.toEqual({ reservationId: 'reservation-1', status: 'RESERVED', availableCredits: 2 });
  });

  it('maps zero balance and duplicate in-flight requests to safe API errors', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'INSUFFICIENT_CREDITS' } });
    await expect(reserveCredit('user-1', '00000000-0000-4000-8000-000000000017')).rejects.toMatchObject({ code: 'INSUFFICIENT_CREDITS', status: 402 });
    rpc.mockResolvedValueOnce({ data: [{ reservation_id: 'reservation-1', reservation_status: 'RESERVED', available_credits: 0, reservation_created: false }], error: null });
    await expect(reserveCredit('user-1', '00000000-0000-4000-8000-000000000017')).rejects.toMatchObject({ code: 'SCAN_ALREADY_IN_PROGRESS', status: 409 });
  });

  it('uses separate atomic RPCs to finalize or release a reservation', async () => {
    rpc.mockResolvedValueOnce({ data: 2, error: null }).mockResolvedValueOnce({ data: 3, error: null });
    await expect(finalizeCredit('user-1', 'reservation-1', 'report-1')).resolves.toBe(2);
    await expect(releaseCredit('user-1', 'reservation-2', 'system failure')).resolves.toBe(3);
    expect(rpc.mock.calls.map((call) => call[0])).toEqual(['finalize_deep_scan_credit', 'release_deep_scan_credit']);
  });
});
