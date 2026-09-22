import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { validatedCheckoutUrl, WhopPaymentService } from './whop.provider.js';

const secret = 'ws_assetforge_test_secret';

function signed(body: unknown) {
  const payload = Buffer.from(JSON.stringify(body));
  const id = (body as { id: string }).id;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = `v1,${createHmac('sha256', secret).update(`${id}.${timestamp}.${payload.toString('utf8')}`).digest('base64')}`;
  return { payload, headers: { id, timestamp, signature } };
}

beforeEach(() => { process.env.WHOP_WEBHOOK_SECRET = secret; process.env.WHOP_COMPANY_ID = 'biz_assetforge'; });
afterEach(() => { delete process.env.WHOP_WEBHOOK_SECRET; delete process.env.WHOP_COMPANY_ID; });

describe('Whop payment provider', () => {
  it('allows only trusted HTTPS Whop checkout URLs', () => {
    expect(validatedCheckoutUrl('https://sandbox.whop.com/checkout/plan_test')).toBe('https://sandbox.whop.com/checkout/plan_test');
    expect(() => validatedCheckoutUrl('https://whop.com.evil.example/checkout/plan_test')).toThrow('untrusted checkout URL');
    expect(() => validatedCheckoutUrl('http://whop.com/checkout/plan_test')).toThrow('untrusted checkout URL');
  });

  it('normalizes a tax-inclusive verified payment and binds it to the Whop plan', () => {
    const webhook = signed({
      id: 'msg_success', type: 'payment.succeeded', company_id: 'biz_assetforge',
      data: {
        id: 'pay_assetforge', checkout_configuration_id: 'ch_assetforge', currency: 'usd', subtotal: 2.49, tax_amount: 0.50, total: 2.99,
        plan: { id: 'plan_assetforge' },
        metadata: { integration: 'assetforge_verify', user_id: '4e6f37bf-ea8d-4f85-b24e-58cb3b52362c', client_reference_id: '64a135e6-92ea-4876-8f1c-ea4b84654560', pack_id: 'DEEP_SCAN_1', credits: '1', currency: 'USD' },
      },
    });
    expect(new WhopPaymentService().verifyWebhook(webhook.payload, webhook.headers)).toMatchObject({
      type: 'PURCHASE_COMPLETED', provider: 'whop', checkoutId: 'ch_assetforge', paymentId: 'pay_assetforge', planId: 'plan_assetforge', credits: 1, subtotal: 249, taxAmount: 50, amountPaid: 299,
    });
  });

  it('rejects a webhook issued for another Whop company', () => {
    const webhook = signed({
      id: 'msg_company', type: 'payment.succeeded', company_id: 'biz_other',
      data: { id: 'pay_other', checkout_configuration_id: 'ch_other', currency: 'usd', subtotal: 2.99, tax_amount: null, total: 2.99, plan: { id: 'plan_other' }, metadata: { integration: 'assetforge_verify', user_id: '4e6f37bf-ea8d-4f85-b24e-58cb3b52362c', client_reference_id: '64a135e6-92ea-4876-8f1c-ea4b84654560', pack_id: 'DEEP_SCAN_1', credits: '1', currency: 'USD' } },
    });
    expect(() => new WhopPaymentService().verifyWebhook(webhook.payload, webhook.headers)).toThrow('company does not match');
  });

  it('rejects a forged signature', () => {
    const webhook = signed({ id: 'msg_invalid', type: 'payment.failed', company_id: 'biz_assetforge', data: { id: 'pay_bad', checkout_configuration_id: 'ch_bad', currency: 'usd', subtotal: 2.99, tax_amount: null, total: 2.99, plan: { id: 'plan_bad' }, metadata: {} } });
    expect(() => new WhopPaymentService().verifyWebhook(webhook.payload, { ...webhook.headers, signature: 'v1,invalid' })).toThrow('Invalid payment webhook signature.');
  });

  it('records a failed checkout even when Whop omits payment metadata', () => {
    const webhook = signed({ id: 'msg_failed', type: 'payment.failed', company_id: 'biz_assetforge', data: { id: 'pay_failed', checkout_configuration_id: 'ch_failed', metadata: null } });
    expect(new WhopPaymentService().verifyWebhook(webhook.payload, webhook.headers)).toEqual({ id: 'msg_failed', type: 'PURCHASE_FAILED', checkoutId: 'ch_failed' });
  });

  it('normalizes refund amounts so the controller can reject partial reversals', () => {
    const webhook = signed({ id: 'msg_refund', type: 'refund.created', company_id: 'biz_assetforge', data: { id: 'rf_assetforge', amount: 1, currency: 'usd', status: 'succeeded', payment: { id: 'pay_assetforge', plan: { id: 'plan_assetforge' } } } });
    expect(new WhopPaymentService().verifyWebhook(webhook.payload, webhook.headers)).toMatchObject({ type: 'PAYMENT_REFUNDED', refundId: 'rf_assetforge', amount: 100, planId: 'plan_assetforge', currency: 'USD' });
  });
});
