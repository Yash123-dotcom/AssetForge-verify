import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getCheckoutStatus, getCreditBalance } from '../services/verifyApi';

export function PaymentResultPage({ cancelled = false }: { cancelled?: boolean }) {
  const [params] = useSearchParams(); const [status, setStatus] = useState<{ credits: number; state: string } | null>(null); const [balance, setBalance] = useState<number | null>(null);
  useEffect(() => {
    const id = params.get('session_id'); if (cancelled || !id) return;
    let cancelledRequest = false; let attempts = 0; let timer: number | undefined;
    const refresh = async () => {
      try {
        const { checkout } = await getCheckoutStatus(id);
        if (cancelledRequest) return;
        const next = checkout ? { credits: checkout.credits_purchased, state: checkout.status } : { credits: 0, state: 'PENDING' };
        setStatus(next); attempts += 1;
        if (next.state === 'SUCCEEDED') { const credit = await getCreditBalance(); if (!cancelledRequest) setBalance(credit.availableCredits); }
        else if (attempts < 8) timer = window.setTimeout(() => void refresh(), 2000);
      } catch { if (!cancelledRequest) setStatus({ credits: 0, state: 'ERROR' }); }
    };
    void refresh();
    return () => { cancelledRequest = true; if (timer) window.clearTimeout(timer); };
  }, [params, cancelled]);
  if (cancelled) return <main className="payment-result shell"><div><p className="eyebrow">CHECKOUT CANCELLED</p><h1>No charge was made.</h1><p>You can return whenever you are ready.</p><Link className="editorial-button" to="/pricing">Return to Pricing</Link></div></main>;
  const complete = status?.state === 'SUCCEEDED';
  const failedToLoad = status?.state === 'ERROR';
  return <main className="payment-result shell"><div>{complete && <CheckCircle2 />}<p className="eyebrow">PAYMENT / VERIFIED STATUS</p><h1>{complete ? 'Credits added.' : failedToLoad ? 'Check your dashboard.' : 'Confirming your payment.'}</h1><p>{complete ? `${status.credits} Deep Scan ${status.credits === 1 ? 'credit' : 'credits'} added to your account.${balance === null ? '' : ` Available: ${balance} credits.`}` : failedToLoad ? 'The verified checkout record could not be loaded. No credits were granted from this URL; your dashboard will show them after the payment webhook is confirmed.' : 'Credits appear after Whop confirms the payment webhook. This page checks the verified server record automatically.'}</p><div><Link className="editorial-button" to="/verify">Scan Your First Package</Link><Link className="button secondary" to="/dashboard">Go to Dashboard</Link></div></div></main>;
}
