import { afterEach, describe, expect, it } from 'vitest';
import { creditPack } from './pricing.config.js';

afterEach(() => { delete process.env.WHOP_PLAN_DEEP_SCAN_5_INR; });

describe('server-owned credit pricing', () => {
  it('resolves credits and amount from server configuration, not client values', () => {
    process.env.WHOP_PLAN_DEEP_SCAN_5_INR = 'plan_server_owned';
    expect(creditPack('DEEP_SCAN_5', 'INR')).toMatchObject({ credits: 5, amount: 49900, providerPlanId: 'plan_server_owned' });
  });

  it('rejects unknown products and currencies', () => {
    expect(() => creditPack('FREE_1000', 'INR')).toThrow('Choose a valid Deep Scan credit pack.');
    expect(() => creditPack('DEEP_SCAN_5', 'BTC')).toThrow('Choose a valid Deep Scan credit pack.');
  });
});
