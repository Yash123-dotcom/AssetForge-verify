import { ArrowUpRight } from 'lucide-react';
import { trackEvent } from '../services/analytics';

export function ExploreCta() {
  return <div className="marketplace-cta"><div><h3>Want assets designed to work without setup headaches?</h3><p>Explore tools and production-ready assets from AssetForge.</p></div><a href="https://assetforge.co.in" target="_blank" rel="noreferrer" onClick={() => trackEvent('assetforge_cta_clicked')}>Explore AssetForge <ArrowUpRight size={17} /></a></div>;
}
