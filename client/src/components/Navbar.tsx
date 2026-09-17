import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { trackEvent } from '../services/analytics';
import { BetaBadge } from './BetaBadge';

export function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname, location.hash]);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);
  const navClass = ({ isActive }: { isActive: boolean }) => `nav-link ${isActive ? 'active' : ''}`;
  return <header className="navbar"><div className="nav-inner">
    <Link className="brand" to="/" onClick={() => setOpen(false)} aria-label="AssetForge Verify home"><span className="navbar-logo-mark" aria-hidden="true"><img src="/assetforge-verify-logo.png" alt="" /></span><span>AssetForge<sup>&reg;</sup></span><span className="brand-divider" /><span className="brand-product">Verify</span><BetaBadge /></Link>
    <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open} aria-controls="main-navigation">{open ? <X /> : <Menu />}</button>
    <nav id="main-navigation" className={open ? 'nav-links open' : 'nav-links'} aria-label="Main navigation">
      <NavLink className={navClass} to="/verify" onClick={() => setOpen(false)}>Verify</NavLink>
      <Link className="nav-link" to="/#how-it-works" onClick={() => setOpen(false)}>Process</Link>
      <Link className="nav-link" to="/#why-verify" onClick={() => setOpen(false)}>Why Verify</Link>
    </nav>
    <a className="external-link" href="https://www.assetforge.co.in/categories" target="_blank" rel="noreferrer" onClick={() => trackEvent('assetforge_cta_clicked')}><span>Explore assets</span><ArrowUpRight size={15} /></a>
  </div></header>;
}
