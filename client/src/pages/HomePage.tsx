import { AlertTriangle, ArrowDown, ArrowRight, ArrowUpRight, Check, CircleAlert, FileCode2, Layers3, PackageSearch, ScanSearch, ShieldCheck, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { trackEvent } from '../services/analytics';

const friction = [
  ['Unity version mismatch', 'An asset can target a newer or older Unity generation than your project.'],
  ['Render pipeline mismatch', 'Built-in, URP, and HDRP materials do not always travel cleanly.'],
  ['Custom shader issues', 'A shader can need review before it renders as expected in your pipeline.'],
  ['Dependencies', 'Required packages can add setup work that is easy to miss on a listing.'],
  ['Unexpected setup work', 'A package may need configuration before it is ready for your project.'],
  ['Broken materials', 'Material conversion is often the first problem discovered after import.'],
];

const checks = [
  { icon: <Layers3 />, title: 'Unity version', text: 'Listing evidence for the asset’s Unity generation.', source: 'Asset Store listing' },
  { icon: <ScanSearch />, title: 'Render pipeline', text: 'Built-in, URP, and HDRP compatibility signals.', source: 'Asset Store listing' },
  { icon: <PackageSearch />, title: 'Dependencies', text: 'Named package and dependency signals before integration.', source: 'Asset Store listing' },
  { icon: <ShieldCheck />, title: 'Shaders & materials', text: 'Shader-related evidence from a listing, then deeper package signals.', source: 'Listing + package scan' },
  { icon: <FileCode2 />, title: 'Scripts & binaries', text: 'Static script, assembly, and DLL indicators from the package.', source: 'Package scan' },
  { icon: <AlertTriangle />, title: 'Package structure', text: 'Package composition, documentation, and import-risk evidence.', source: 'Package scan' },
];

const faqs = [
  ['What is AssetForge Verify?', 'AssetForge Verify compares the asset information you provide with your Unity project setup and produces a compatibility report with clear next steps.'],
  ['What is Quick Check?', 'Quick Check is free. It uses a public Asset Store listing or manual details to evaluate core compatibility signals and create a shareable report.'],
  ['What is Deep Scan?', 'Deep Scan is a paid, static inspection of an uploaded Unity package. It checks package-level signals such as scripts, shaders, dependencies, materials, documentation, and DLL indicators.'],
  ['Does Verify guarantee compatibility?', 'No. Verify highlights signals and likely areas of work. Always validate an asset in a backup or test project before production use.'],
  ['When should I use Deep Scan?', 'Use it when an asset is important to your project and you want package-level evidence beyond what a public listing can show.'],
  ['Do I need an account?', 'No account is needed for a Quick Check. An account and one credit are required for Deep Scan.'],
];

export function HomePage() {
  return <main className="landing-page">
    <section className="landing-hero shell">
      <div className="landing-hero-copy">
        <p className="eyebrow">UNITY ASSET COMPATIBILITY ANALYSIS</p>
        <h1>Know what you’re importing.<br /><span>Before you import it.</span></h1>
        <p className="landing-lede">Check Unity assets for compatibility risks, render pipeline issues, dependencies, shaders, scripts, and other signals before they become debugging problems.</p>
        <div className="landing-actions">
          <Link className="editorial-button" to="/verify" onClick={() => trackEvent('quick_check_started', { placement: 'hero' })}>Run a Free Check <ArrowUpRight size={17} /></Link>
          <a className="landing-text-link" href="#how-it-works" onClick={() => trackEvent('hero_cta_clicked', { action: 'how_it_works' })}>See How It Works <ArrowDown size={15} /></a>
        </div>
        <p className="landing-fineprint">Quick Check is free. No account required.</p>
      </div>
      <ProductPreview />
    </section>

    <section className="landing-problem shell" aria-labelledby="problem-title">
      <div className="landing-section-heading"><p className="eyebrow">THE IMPORT PROBLEM</p><h2 id="problem-title">It looked perfect<br />on the Asset Store.</h2><p>Most compatibility work is discovered after the download. Verify gives you a reasoned starting point before that work begins.</p></div>
      <div className="friction-grid">{friction.map(([title, text], index) => <article key={title}><span>{String(index + 1).padStart(2, '0')}</span><X /><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>

    <section className="landing-flow" id="how-it-works">
      <div className="shell"><div className="landing-section-heading compact"><p className="eyebrow">THE PROCESS</p><h2>Less guessing.<br />More context.</h2></div><div className="flow-grid"><FlowStep number="01" title="Choose an asset" text="Paste a public Asset Store URL or enter the information you already have." /><FlowStep number="02" title="Run Verify" text="Compare compatibility signals against your Unity version, pipeline, and platform." /><FlowStep number="03" title="Make a decision" text="See what matches, what needs review, and what to test before integration." /></div><div className="flow-line" aria-label="Asset, Verify, Understand, Build"><span>Asset</span><ArrowRight /><span>Verify</span><ArrowRight /><span>Understand</span><ArrowRight /><span>Build</span></div></div>
    </section>

    <section className="landing-checks shell" aria-labelledby="checks-title">
      <div className="landing-section-heading"><p className="eyebrow">WHAT VERIFY CHECKS</p><h2 id="checks-title">Evidence, not<br />empty assurances.</h2><p>Quick Check works from public listing information and your inputs. Deep Scan adds static evidence from the Unity package itself.</p></div>
      <div className="checks-grid">{checks.map((item) => <article key={item.title}><div>{item.icon}<span>{item.source}</span></div><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
    </section>

    <section className="scan-comparison shell" id="pricing">
      <header><p className="eyebrow">CHOOSE THE RIGHT DEPTH</p><h2>A quick signal.<br /><span>Or package evidence.</span></h2></header>
      <div className="scan-comparison-grid"><article><p className="eyebrow">QUICK CHECK / FREE</p><h3>Start with the listing.</h3><p>Use it when you want a clear compatibility signal before committing to an asset.</p><ul><li><Check />Asset Store listing analysis</li><li><Check />Manual project and asset comparison</li><li><Check />Compatibility score, warnings, and recommendations</li><li><Check />Shareable report</li></ul><Link to="/verify" onClick={() => trackEvent('quick_check_started', { placement: 'comparison' })}>Run a Free Check <ArrowUpRight /></Link></article><article className="deep-scan-card"><p className="eyebrow">DEEP SCAN / CREDITS</p><h3>Inspect the package.</h3><p>Use it when an asset matters enough to check the static evidence inside the actual package.</p><ul><li><Check />Scripts, shaders, materials, and package structure</li><li><Check />Dependency, documentation, assembly, and DLL indicators</li><li><Check />Package-level compatibility findings</li><li><Check />Saved scan history for signed-in users</li></ul><Link to="/pricing" onClick={() => trackEvent('deep_scan_cta_clicked', { placement: 'comparison' })}>View Deep Scan credits <ArrowUpRight /></Link></article></div>
    </section>

    <section className="landing-report shell" aria-labelledby="sample-report-title">
      <div className="landing-section-heading"><p className="eyebrow">SAMPLE REPORT</p><h2 id="sample-report-title">See what a Verify<br />report looks like.</h2><p>A report prioritizes the compatibility signals worth checking, then gives you practical next steps.</p><Link className="editorial-button" to="/demo" onClick={() => trackEvent('sample_report_viewed')}>View Sample Report <ArrowUpRight size={17} /></Link></div>
      <SampleReport />
    </section>

    <section className="landing-transparency"><div className="shell"><CircleAlert /><div><p className="eyebrow">TECHNICAL HONESTY</p><h2>Verify identifies signals.<br />It does not promise certainty.</h2><p>Compatibility depends on the receiving project, package version, Unity configuration, and implementation details. Treat every report as informed guidance and validate important assets in a test project.</p></div></div></section>

    <section className="landing-story shell" id="why-verify"><p className="eyebrow">WHY ASSETFORGE BUILT VERIFY</p><div><h2>Finding an asset was only part of the problem.</h2><p>AssetForge started as a marketplace for Unity assets. While building it, we kept returning to the harder question: “Will this actually work in my project?”</p><p>AssetForge Verify was built to help answer that question before import.</p></div></section>

    <section className="landing-faq shell" aria-labelledby="faq-title"><div className="landing-section-heading compact"><p className="eyebrow">FAQ</p><h2 id="faq-title">Useful before<br />you begin.</h2></div><div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<ArrowRight /></summary><p>{answer}</p></details>)}</div></section>

    <section className="landing-final shell"><p className="eyebrow">START WITH A SIGNAL</p><h2>Before you import it,<br /><span>Verify it.</span></h2><p>Check compatibility signals before spending time debugging an asset.</p><Link className="editorial-button" to="/verify" onClick={() => trackEvent('quick_check_started', { placement: 'final' })}>Run a Free Check <ArrowUpRight size={17} /></Link></section>
  </main>;
}

function ProductPreview() { return <aside className="landing-product-preview" aria-label="Example AssetForge Verify report"><div className="product-preview-bar"><span>ASSET ANALYSIS</span><span>EXAMPLE</span></div><div className="product-preview-title"><div><p>UNITY ASSET</p><h2>Stylized URP VFX Pack</h2><span>Based on Asset Store listing</span></div><span className="preview-status">READY TO REVIEW</span></div><div className="product-preview-score"><div><p>COMPATIBILITY SCORE</p><strong>82<span>/100</span></strong><small>Medium risk · two things to check</small></div><div className="score-note"><Check />URP matches your project</div></div><div className="product-preview-signals"><PreviewSignal label="Unity version" value="Likely compatible" /><PreviewSignal label="Render pipeline" value="URP matches" /><PreviewSignal label="Custom shaders" value="Review before import" warning /><PreviewSignal label="Dependencies" value="Cinemachine detected" warning /></div><Link to="/demo" onClick={() => trackEvent('sample_report_viewed', { placement: 'hero_preview' })}>View Full Report <ArrowUpRight size={16} /></Link></aside>; }
function PreviewSignal({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) { return <div className={warning ? 'preview-signal warning' : 'preview-signal'}>{warning ? <AlertTriangle /> : <Check />}<span>{label}<b>{value}</b></span></div>; }
function FlowStep({ number, title, text }: { number: string; title: string; text: string }) { return <article><span>{number}</span><h3>{title}</h3><p>{text}</p></article>; }
function SampleReport() { return <div className="sample-report"><div className="sample-report-top"><div><p>COMPATIBILITY REPORT / EXAMPLE</p><h3>Stylized URP VFX Pack</h3></div><span>ASSET STORE LISTING</span></div><div className="sample-report-body"><div className="sample-score"><p>COMPATIBILITY</p><strong>82</strong><span>/ 100 · MEDIUM RISK</span></div><div className="sample-findings"><p>TOP SIGNALS</p><PreviewSignal label="Render pipeline" value="URP matches the project" /><PreviewSignal label="Custom shaders" value="Review included Shader Graph materials" warning /><PreviewSignal label="Dependencies" value="Confirm Cinemachine package version" warning /></div></div><div className="sample-recommendation"><span>RECOMMENDED NEXT STEP</span><p>Test the included materials and confirm the required package versions in a backup project.</p></div></div>; }
