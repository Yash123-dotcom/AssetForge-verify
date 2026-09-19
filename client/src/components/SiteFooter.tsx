import { ArrowUpRight, ChevronUp, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';

export function SiteFooter() {
  return <footer className="site-footer"><div className="footer-shell">
    <div className="footer-main"><div className="footer-intro"><img className="footer-verify-logo" src="/assetforge-verify-logo.png" alt="AssetForge Verify" /><p className="eyebrow">/ BUILT FOR UNITY</p><h2>Know what works,<br />before you import.</h2><Link to="/verify" className="footer-action">Run a compatibility check <ArrowUpRight size={16} /></Link></div>
      <div className="footer-links"><FooterColumn title="Verify" links={[['Start a report', '/verify'], ['How it works', '/#how-it-works'], ['Why verify', '/#why-verify']]} local /><FooterColumn title="AssetForge" links={[['All releases', 'https://www.assetforge.co.in/categories'], ['Documentation', 'https://www.assetforge.co.in/docs'], ['About', 'https://www.assetforge.co.in/about']]} /><FooterColumn title="Support" links={[['Help & FAQ', 'https://www.assetforge.co.in/support'], ['Installation', 'https://www.assetforge.co.in/support#install'], ['Contact', 'mailto:assetforge@outlook.in']]} /></div>
    </div>
    <div className="footer-meta"><span>© 2026 AssetForge. All rights reserved. · v0.7 Beta</span><div><a href="https://www.instagram.com/assetforge.ai/" target="_blank" rel="noreferrer" aria-label="AssetForge on Instagram"><Instagram size={15} /></a><button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Top <ChevronUp size={14} /></button></div></div>
    <div className="footer-wordmark">AssetForge<sup>&reg;</sup></div>
  </div></footer>;
}

function FooterColumn({ title, links, local = false }: { title: string; links: string[][]; local?: boolean }) {
  return <div><p>{title}</p><ul>{links.map(([label, href]) => <li key={label}>{local ? <Link to={href}>{label}</Link> : <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined}>{label}</a>}</li>)}</ul></div>;
}
