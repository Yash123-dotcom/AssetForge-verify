import { ArrowRight, ArrowUpRight, Check, TriangleAlert, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RiskBadge } from '../components/RiskBadge';

export function HomePage() {
  return <main className="editorial-home">
    <section className="brand-hero shell">
      <div className="hero-kicker"><span>Unity compatibility intelligence</span><span className="hero-logo-signature"><span className="hero-logo-mark"><img src="/assetforge-verify-logo.png" alt="" /></span>AssetForge Verify</span><span>Project / Asset / Report</span></div>
      <h1>Know before<br />you <span>import.</span></h1>
      <div className="hero-support"><p>Check whether a Unity asset fits your project before you spend an hour fixing shaders, dependencies, or render pipeline issues.</p><Link className="editorial-button" to="/verify">Verify an asset <ArrowUpRight size={17} /></Link></div>
      <div className="hero-proof" aria-label="Product highlights"><span><b>05</b> compatibility signals</span><span><b>&lt;60s</b> guided setup</span><span><b>01</b> shareable report</span></div>
      <div className="report-showcase"><div className="showcase-bar"><span>Live preview / 001</span><span>AssetForge Compatibility Report</span></div><div className="showcase-grid"><div className="showcase-score"><p>Compatibility score</p><div><strong>87</strong><span>/ 100</span></div><RiskBadge risk="LOW" /></div><div className="showcase-checks"><PreviewCheck icon={<Check />} label="Render pipeline" value="URP matches" /><PreviewCheck icon={<Check />} label="Unity generation" value="Likely compatible" /><PreviewCheck icon={<TriangleAlert />} label="Shader review" value="Custom shaders detected" warning /></div></div><div className="showcase-foot"><span>Based on the information provided</span><span>Heuristic, not a guarantee</span></div></div>
    </section>

    <section className="studio-intro shell"><div><p className="eyebrow">/ BUILT FOR UNITY</p></div><div><h2>Every import should begin<br />with better information.</h2><div className="intro-points"><span><b>01</b> Five focused checks</span><span><b>02</b> Clear risk signals</span><span><b>03</b> Shareable reports</span></div></div></section>

    <section className="editorial-process shell" id="how-it-works"><div className="section-rule-heading"><div><p className="eyebrow">/ THE PROCESS</p><h2>How it works</h2></div><Link to="/verify">Start a report <ArrowUpRight /></Link></div><div className="process-list"><Process number="01" title="Your project" text="Choose the Unity generation, render pipeline, and platform you are building for." /><Process number="02" title="The asset" text="Add the setup the asset was tested against, including shaders and dependencies." /><Process number="03" title="The report" text="Review compatibility signals, next steps, and feedback from real-world use." /></div></section>

    <section className="green-manifesto" id="why-verify"><div className="shell"><p>/ LESS FIXING. MORE MAKING.</p><h2>Check.<br />Compare.<br />Then import.</h2><span>Keep setup predictable. Spend more time building.</span></div></section>

    <section className="editorial-value shell"><div className="section-rule-heading"><div><p className="eyebrow">/ COMMON FRICTION</p><h2>Compatibility<br />shouldn't be guesswork.</h2></div></div><div className="value-rows"><Value number="01" title="Broken materials" text="Assets made for another render pipeline can require conversion or shader repair." /><Value number="02" title="Hidden dependencies" text="Required Unity packages are often only discovered after an asset is imported." /><Value number="03" title="Version uncertainty" text="Older assets may work as expected — or need deliberate testing and updates." /></div></section>

    <section className="closing-cta shell"><p className="eyebrow">/ START A REPORT</p><h2>Make your next import<br /><span>an informed one.</span></h2><Link className="editorial-button" to="/verify">Verify an asset <ArrowRight size={17} /></Link></section>
  </main>;
}

function PreviewCheck({ icon, label, value, warning = false }: { icon: React.ReactNode; label: string; value: string; warning?: boolean }) { return <div className={warning ? 'preview-check warning' : 'preview-check'}><span>{icon}</span><p>{label}<b>{value}</b></p></div>; }
function Process({ number, title, text }: { number: string; title: string; text: string }) { return <article><span>{number}</span><h3>{title}</h3><p>{text}</p><ArrowUpRight /></article>; }
function Value({ number, title, text }: { number: string; title: string; text: string }) { return <article><span>{number}</span><h3>{title}</h3><p>{text}</p><X /></article>; }
