import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { BetaBadge } from './BetaBadge';
import { useAuth } from './auth-context';

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
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
      <NavLink className={navClass} to="/pricing" onClick={() => setOpen(false)}>Pricing</NavLink>
      {user && <NavLink className={navClass} to="/dashboard" onClick={() => setOpen(false)}>Dashboard</NavLink>}
      <Link className="nav-link" to="/#how-it-works" onClick={() => setOpen(false)}>Process</Link>
      <Link className="nav-link" to="/#why-verify" onClick={() => setOpen(false)}>Why Verify</Link>
    </nav>
    {user ? <Link className="external-link" to="/account"><span>Account</span><ArrowUpRight size={15} /></Link> : <Link className="external-link" to="/login"><span>Sign In</span><ArrowUpRight size={15} /></Link>}
  </div></header>;
}
