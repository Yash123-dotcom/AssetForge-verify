import { Check, LoaderCircle, Minus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth-context';
import { trackEvent } from '../services/analytics';
import { createCheckout, getPricing } from '../services/verifyApi';
import type { CreditPack } from '../types/verify.types';

export function PricingPage() {
  const [packs, setPacks] = useState<CreditPack[]>([]); const [busy, setBusy] = useState<string | null>(null); const [error, setError] = useState('');
  const { user } = useAuth(); const navigate = useNavigate();
  useEffect(() => { trackEvent('pricing_viewed'); void getPricing().then((result) => setPacks(result.packs)).catch((caught) => setError(caught instanceof Error ? caught.message : 'Pricing could not be loaded.')); }, []);
  async function buy(pack: CreditPack) {
    trackEvent('credit_pack_selected', { pack: pack.id, currency: 'USD' });
    if (!user) { navigate('/login', { state: { from: '/pricing' } }); return; }
    setBusy(pack.id); setError('');
    try { const result = await createCheckout(pack.id, 'USD'); window.location.assign(result.url); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Checkout could not be started.'); setBusy(null); }
  }
  const quick = ['Listing analysis', 'Manual compatibility', 'Basic score', 'Basic warnings', 'Recommendations', 'Shareable report'];
  const deep = ['Everything in Quick Check', 'Package inspection', 'Shader detection', 'Script signals', 'Package dependencies', 'DLL/binary indicators', 'Detailed compatibility findings', 'Saved scan history'];
  return <main className="pricing-page shell"><header><p className="eyebrow">PRICING / CREDITS</p><h1>Go deeper when the asset<br /><span>actually matters.</span></h1><p>Quick Check is free. Deep Scan inspects the Unity package itself for shaders, scripts, dependencies, and compatibility signals.</p></header>
    {error && <div className="form-error" role="alert">{error}</div>}
    <section className="pricing-grid"><article className="price-card free"><p className="eyebrow">FREE</p><h2>Quick Check</h2><strong className="price-amount">$0</strong><ul>{quick.map((item) => <li key={item}><Check />{item}</li>)}</ul><Link className="price-cta" to="/verify">Try Quick Check</Link></article>{packs.map((pack) => <article className={`price-card ${pack.popular ? 'popular' : ''}`} key={pack.id}>{pack.popular && <span className="popular-label">Most Popular</span>}<p className="eyebrow">DEEP SCAN CREDITS</p><h2>{pack.credits} Deep {pack.credits === 1 ? 'Scan' : 'Scans'}</h2><strong className="price-amount">{pack.prices.USD.formatted}</strong><p>{pack.credits} {pack.credits === 1 ? 'credit' : 'credits'} · {pack.credits} package {pack.credits === 1 ? 'scan' : 'scans'}</p><button className="price-cta" disabled={Boolean(busy)} onClick={() => void buy(pack)}>{busy === pack.id ? <LoaderCircle className="spinner" /> : `Buy ${pack.credits} ${pack.credits === 1 ? 'Credit' : 'Credits'}`}</button></article>)}</section>
    <p className="pricing-trust">Credits do not expire. Quick Check remains free. Payments are completed securely through hosted checkout.</p>
    <section className="plan-comparison"><div><p className="eyebrow">COMPARE</p><h2>Free insight or package evidence.</h2></div><div className="comparison-columns"><article><h3>Quick Check</h3>{[...quick, 'Package inspection', 'Shader detection', 'Script signal analysis', 'Dependency extraction from package', 'DLL detection'].map((item, index) => <p key={item}>{index < quick.length ? <Check /> : <Minus />}{item}</p>)}</article><article><h3>Deep Scan</h3>{deep.map((item) => <p key={item}><Check />{item}</p>)}</article></div></section>
  </main>;
}
