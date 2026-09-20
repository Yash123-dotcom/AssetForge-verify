import { afterEach, describe, expect, it } from 'vitest';
import { creditPack } from './pricing.config.js';

afterEach(() => { delete process.env.WHOP_PLAN_DEEP_SCAN_5_USD; });

describe('server-owned credit pricing', () => {
  it('resolves credits and amount from server configuration, not client values', () => {
    process.env.WHOP_PLAN_DEEP_SCAN_5_USD = 'plan_server_owned';
    expect(creditPack('DEEP_SCAN_5', 'USD')).toMatchObject({ credits: 5, amount: 799, providerPlanId: 'plan_server_owned' });
  });

  it('rejects unknown products and currencies', () => {
    expect(() => creditPack('FREE_1000', 'USD')).toThrow('Choose a valid USD Deep Scan credit pack.');
    expect(() => creditPack('DEEP_SCAN_5', 'INR')).toThrow('Choose a valid USD Deep Scan credit pack.');
  });
});
