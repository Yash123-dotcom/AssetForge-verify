import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WhopPaymentService } from './whop.provider.js';

const secret = 'ws_assetforge_test_secret';

function signed(body: unknown) {
  const payload = Buffer.from(JSON.stringify(body));
  const id = (body as { id: string }).id;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = `v1,${createHmac('sha256', secret).update(`${id}.${timestamp}.${payload.toString('utf8')}`).digest('base64')}`;
  return { payload, headers: { id, timestamp, signature } };
}

beforeEach(() => { process.env.WHOP_WEBHOOK_SECRET = secret; });
afterEach(() => { delete process.env.WHOP_WEBHOOK_SECRET; });

describe('Whop payment provider', () => {
  it('normalizes a verified successful payment into minor currency units', () => {
    const webhook = signed({
      id: 'msg_success', type: 'payment.succeeded',
      data: {
        id: 'pay_assetforge', checkout_configuration_id: 'ch_assetforge', currency: 'inr', total: 499,
        metadata: { integration: 'assetforge_verify', user_id: '4e6f37bf-ea8d-4f85-b24e-58cb3b52362c', client_reference_id: '64a135e6-92ea-4876-8f1c-ea4b84654560', pack_id: 'DEEP_SCAN_5', credits: '5', currency: 'INR' },
      },
    });
    expect(new WhopPaymentService().verifyWebhook(webhook.payload, webhook.headers)).toMatchObject({
      type: 'PURCHASE_COMPLETED', provider: 'whop', checkoutId: 'ch_assetforge', paymentId: 'pay_assetforge', credits: 5, amount: 49900,
    });
  });

  it('rejects a forged signature', () => {
    const webhook = signed({ id: 'msg_invalid', type: 'payment.failed', data: { id: 'pay_bad', checkout_configuration_id: 'ch_bad', currency: 'usd', total: 2.99, metadata: {} } });
    expect(() => new WhopPaymentService().verifyWebhook(webhook.payload, { ...webhook.headers, signature: 'v1,invalid' })).toThrow('Invalid payment webhook signature.');
  });

  it('normalizes refund amounts so the controller can reject partial reversals', () => {
    const webhook = signed({ id: 'msg_refund', type: 'refund.created', data: { amount: 1, status: 'succeeded', payment: { id: 'pay_assetforge', metadata: { integration: 'assetforge_verify', user_id: '4e6f37bf-ea8d-4f85-b24e-58cb3b52362c', client_reference_id: '64a135e6-92ea-4876-8f1c-ea4b84654560', pack_id: 'DEEP_SCAN_1', credits: '1', currency: 'USD' } } } });
    expect(new WhopPaymentService().verifyWebhook(webhook.payload, webhook.headers)).toMatchObject({ type: 'PAYMENT_REFUNDED', amount: 100, packId: 'DEEP_SCAN_1' });
  });
});
