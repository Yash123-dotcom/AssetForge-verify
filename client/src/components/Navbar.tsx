import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

export function Navbar() {
  const [open, setOpen] = useState(false);
  const navClass = ({ isActive }: { isActive: boolean }) => `nav-link ${isActive ? 'active' : ''}`;
  return <header className="navbar"><div className="nav-inner">
    <Link className="brand" to="/" onClick={() => setOpen(false)} aria-label="AssetForge Verify home"><span className="navbar-logo-mark" aria-hidden="true"><img src="/assetforge-verify-logo.png" alt="" /></span><span>AssetForge<sup>&reg;</sup></span><span className="brand-divider" /><span className="brand-product">Verify</span></Link>
    <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}>{open ? <X /> : <Menu />}</button>
    <nav className={open ? 'nav-links open' : 'nav-links'} aria-label="Main navigation">
      <NavLink className={navClass} to="/verify" onClick={() => setOpen(false)}>Verify</NavLink>
      <Link className="nav-link" to="/#how-it-works" onClick={() => setOpen(false)}>Process</Link>
      <Link className="nav-link" to="/#why-verify" onClick={() => setOpen(false)}>Why Verify</Link>
    </nav>
    <a className="external-link" href="https://www.assetforge.co.in/categories" target="_blank" rel="noreferrer">Asset Library <ArrowUpRight size={15} /></a>
  </div></header>;
}
