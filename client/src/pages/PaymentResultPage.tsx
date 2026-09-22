import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getCheckoutStatus, getCreditBalance } from '../services/verifyApi';

export function PaymentResultPage({ cancelled = false }: { cancelled?: boolean }) {
  const [params] = useSearchParams(); const [status, setStatus] = useState<{ credits: number; state: string } | null>(null); const [balance, setBalance] = useState<number | null>(null);
  const checkoutId = params.get('session_id');
  useEffect(() => {
    if (cancelled) return;
    if (!checkoutId) { setStatus({ credits: 0, state: 'ERROR' }); return; }
    let cancelledRequest = false; let attempts = 0; let timer: number | undefined;
    const refresh = async () => {
      try {
        const { checkout } = await getCheckoutStatus(checkoutId);
        if (cancelledRequest) return;
        const next = checkout ? { credits: checkout.credits_purchased, state: checkout.status } : { credits: 0, state: 'PENDING' };
        setStatus(next); attempts += 1;
        if (next.state === 'SUCCEEDED') {
          try { const credit = await getCreditBalance(); if (!cancelledRequest) setBalance(credit.availableCredits); }
          catch { /* The confirmed checkout remains successful if the balance lookup is temporarily unavailable. */ }
        }
        else if (next.state === 'PENDING' && attempts < 8) timer = window.setTimeout(() => void refresh(), 2000);
        else if (next.state === 'PENDING') setStatus({ ...next, state: 'DELAYED' });
      } catch { if (!cancelledRequest) setStatus({ credits: 0, state: 'ERROR' }); }
    };
    void refresh();
    return () => { cancelledRequest = true; if (timer) window.clearTimeout(timer); };
  }, [checkoutId, cancelled]);
  if (cancelled) return <main className="payment-result shell"><div><p className="eyebrow">CHECKOUT CLOSED</p><h1>Checkout was closed.</h1><p>If you completed a payment, check your dashboard before trying again. Credits appear only after Whop confirms the payment.</p><Link className="editorial-button" to="/dashboard">Check Dashboard</Link><Link className="button secondary" to="/pricing">Return to Pricing</Link></div></main>;
  const complete = status?.state === 'SUCCEEDED';
  const failedToLoad = status?.state === 'ERROR';
  const failedPayment = status?.state === 'FAILED';
  const refunded = status?.state === 'REFUNDED';
  const partiallyRefunded = status?.state === 'PARTIALLY_REFUNDED';
  const delayed = status?.state === 'DELAYED';
  const heading = complete ? 'Credits added.' : refunded ? 'Payment refunded.' : partiallyRefunded ? 'Payment partially refunded.' : failedPayment ? 'Payment did not complete.' : failedToLoad ? 'Check your dashboard.' : delayed ? 'Confirmation is taking longer.' : 'Confirming your payment.';
  const description = complete
    ? `${status.credits} Deep Scan ${status.credits === 1 ? 'credit' : 'credits'} added to your account.${balance === null ? '' : ` Available: ${balance} credits.`}`
    : refunded ? 'Whop confirmed a full refund. Check your dashboard for your current credit balance.'
      : partiallyRefunded ? 'Whop confirmed a partial refund. Check your dashboard for your current credit balance.'
        : failedPayment ? 'Whop reported that this checkout failed. No credits were added; you can try again from Pricing.'
      : failedToLoad ? 'The verified checkout record could not be loaded. This URL cannot grant credits; check your dashboard for the latest balance.'
        : delayed ? 'The payment has not been confirmed yet. Refresh this page later or check your dashboard; do not purchase again until you verify the result.'
          : 'Credits appear after Whop confirms the payment webhook. This page checks the verified server record automatically.';
  return <main className="payment-result shell"><div>{complete && <CheckCircle2 />}<p className="eyebrow">PAYMENT / VERIFIED STATUS</p><h1>{heading}</h1><p>{description}</p><div>{failedPayment ? <Link className="editorial-button" to="/pricing">Return to Pricing</Link> : complete ? <Link className="editorial-button" to="/verify">Scan Your First Package</Link> : refunded || partiallyRefunded ? null : <button className="editorial-button" type="button" onClick={() => window.location.reload()}>Check Again</button>}<Link className="button secondary" to="/dashboard">Go to Dashboard</Link></div></div></main>;
}
