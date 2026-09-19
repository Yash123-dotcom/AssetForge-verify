import { ServiceError } from '../lib/errors.js';

export type Currency = 'INR' | 'USD';
export type CreditPackId = 'DEEP_SCAN_1' | 'DEEP_SCAN_5' | 'DEEP_SCAN_15';
export type PublicCreditPack = { id: CreditPackId; credits: number; popular: boolean; prices: Record<Currency, { amount: number; formatted: string }> };

export const CREDIT_PACKS: PublicCreditPack[] = [
  { id: 'DEEP_SCAN_1', credits: 1, popular: false, prices: { INR: { amount: 14900, formatted: '₹149' }, USD: { amount: 299, formatted: '$2.99' } } },
  { id: 'DEEP_SCAN_5', credits: 5, popular: true, prices: { INR: { amount: 49900, formatted: '₹499' }, USD: { amount: 799, formatted: '$7.99' } } },
  { id: 'DEEP_SCAN_15', credits: 15, popular: false, prices: { INR: { amount: 99900, formatted: '₹999' }, USD: { amount: 1499, formatted: '$14.99' } } },
];

export function creditPack(packId: string, currency: string) {
  const normalizedCurrency = currency.toUpperCase() as Currency;
  const pack = CREDIT_PACKS.find((item) => item.id === packId);
  if (!pack || !['INR', 'USD'].includes(normalizedCurrency)) throw new ServiceError('INVALID_CREDIT_PACK', 'Choose a valid Deep Scan credit pack.', 400);
  const suffix = pack.id.replace('DEEP_SCAN_', '');
  const providerPlanId = process.env[`WHOP_PLAN_DEEP_SCAN_${suffix}_${normalizedCurrency}`]
    ?? (normalizedCurrency === (process.env.DEFAULT_PAYMENT_CURRENCY ?? 'INR') ? process.env[`WHOP_PLAN_DEEP_SCAN_${suffix}`] : undefined);
  if (!providerPlanId) throw new ServiceError('PAYMENT_NOT_CONFIGURED', 'Checkout is not configured for this credit pack and currency.', 503);
  return { ...pack, currency: normalizedCurrency, amount: pack.prices[normalizedCurrency].amount, providerPlanId };
}
