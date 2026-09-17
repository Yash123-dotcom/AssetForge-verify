import { ArrowLeft, Check, Copy, FileText, LoaderCircle, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BetaBadge } from '../components/BetaBadge';
import { CheckCard } from '../components/CheckCard';
import { CommunityFeedback } from '../components/CommunityFeedback';
import { CompatibilityScore } from '../components/CompatibilityScore';
import { ExploreCta } from '../components/ExploreCta';
import { RecommendationList } from '../components/RecommendationList';
import { ReportMetadata } from '../components/ReportMetadata';
import { ReportUsefulness } from '../components/ReportUsefulness';
import { trackEvent } from '../services/analytics';
import { ApiError, getReport } from '../services/verifyApi';
import type { CheckStatus, VerificationReport } from '../types/verify.types';

const demoReport: VerificationReport = {
  id: 'demo', score: 85, risk: 'LOW', createdAt: 'Private beta demo',
  project: { unityVersion: '6000', pipeline: 'URP', platform: 'WINDOWS' },
  asset: { testedUnityVersion: '2022', pipeline: 'URP', customShaders: true, dependencies: ['Cinemachine'] },
  metadata: { assetName: 'Stylized Fire Shader', publisherName: 'Example Studio', metadataSource: 'USER' },
  summary: 'This asset should work with a few manual checks. Review the Unity version gap and custom shaders before importing.',
  checks: [
    { id: 'unity-version', category: 'Unity version', status: 'WARNING', severity: 'HIGH', scoreImpact: -10, message: 'Unity 2022 LTS and Unity 6 are two generations apart. Test for deprecated APIs and package changes.' },
    { id: 'shaders', category: 'Custom shaders', status: 'WARNING', severity: 'MEDIUM', scoreImpact: 0, message: 'Custom shaders are present. Review rendering and materials after import.' },
    { id: 'dependencies', category: 'Dependencies', status: 'PASS', severity: 'LOW', scoreImpact: 5, message: 'One external dependency was reported. Confirm its package version.', details: ['Cinemachine'] },
    { id: 'pipeline', category: 'Render pipeline', status: 'PASS', severity: 'INFO', scoreImpact: 20, message: 'The asset and project both use URP.' },
    { id: 'platform', category: 'Target platform', status: 'PASS', severity: 'INFO', scoreImpact: 0, message: 'No explicit Windows conflict was found from the supplied information.' },
  ],
  recommendations: ['Import into a backup project first.', 'Check Console warnings after Unity upgrades the asset.', 'Confirm the custom shader renders correctly in URP.', 'Install the expected Cinemachine version before testing scenes.'],
};

export function ReportPage({ demo = false }: { demo?: boolean }) {
  const { id } = useParams();
  const [report, setReport] = useState<VerificationReport | null>(demo ? demoReport : null);
  const [loading, setLoading] = useState(!demo); const [notFound, setNotFound] = useState(false); const [loadError, setLoadError] = useState(false); const [reload, setReload] = useState(0);
  const [copied, setCopied] = useState<'link' | 'summary' | null>(null);
  const viewTracked = useRef(false);

  useEffect(() => {
    document.title = demo ? 'AssetForge Verify — Demo Report' : 'AssetForge Verify — Compatibility Report';
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', 'Unity asset compatibility report generated with AssetForge Verify.');
    if (demo) { if (!viewTracked.current) { viewTracked.current = true; trackEvent('report_viewed', { is_demo: true }); trackEvent('top_issue_seen', { is_demo: true, category: demoReport.checks[0].category }); } return; }
    if (!id) { setNotFound(true); setLoading(false); return; }
    setLoading(true); setLoadError(false); setNotFound(false);
    getReport(id).then((result) => {
      setReport(result); document.title = `AssetForge Verify — ${result.score}/100 ${result.risk} risk`;
      if (!viewTracked.current) {
        viewTracked.current = true; trackEvent('report_viewed');
        const topIssue = result.checks.find((check) => check.status !== 'PASS');
        if (topIssue) trackEvent('top_issue_seen', { category: topIssue.category });
      }
    }).catch((error) => { if (error instanceof ApiError && error.code === 'REPORT_NOT_FOUND') setNotFound(true); else setLoadError(true); }).finally(() => setLoading(false));
  }, [id, demo, reload]);

  async function copyText(kind: 'link' | 'summary') {
    if (!report) return;
    const label = report.score >= 80 ? 'A few checks recommended' : report.score >= 55 ? 'Manual fixes may be needed' : 'Compatibility work likely';
    const text = kind === 'link' ? window.location.href : `AssetForge Verify report: ${report.score}/100 — ${label}\n${window.location.href}`;
    try { await navigator.clipboard.writeText(text); }
    catch { const input = document.createElement('textarea'); input.value = text; input.style.position = 'fixed'; input.style.opacity = '0'; document.body.appendChild(input); input.select(); document.execCommand('copy'); input.remove(); }
    setCopied(kind); trackEvent('report_shared', { format: kind, is_demo: demo }); window.setTimeout(() => setCopied(null), 2200);
  }

  if (loading) return <main className="report-loading shell" aria-live="polite"><LoaderCircle className="spinner" /><p>Loading compatibility report…</p></main>;
  if (loadError) return <main className="empty-report shell"><div><p className="eyebrow">REPORT UNAVAILABLE</p><h1>We couldn't load this report.</h1><p>The API may be temporarily unavailable. Your link is still valid.</p><button className="button primary" type="button" onClick={() => { trackEvent('retry_after_error', { area: 'report' }); setReload((value) => value + 1); }}><RotateCcw size={16} /> Try Again</button></div></main>;
  if (notFound || !report) return <main className="empty-report shell"><div><p className="eyebrow">REPORT NOT FOUND</p><h1>This report isn't available.</h1><p>It may have been removed, or the link might be incomplete.</p><Link className="button primary" to="/verify">Verify another asset</Link></div></main>;

  const topChecks = report.checks.filter((check) => check.status !== 'PASS').slice(0, 3);
  return <main className="report-page shell">
    <Link className="back-link" to="/verify"><ArrowLeft size={16} /> New verification</Link>
    <div className="report-heading"><div><p className="eyebrow">ANALYSIS COMPLETE / REPORT</p><h1>Compatibility<br /><span>Report.</span></h1></div><div className="report-stamp"><BetaBadge /><span>AssetForge Verify</span><small>{demo ? 'Static demonstration · no data saved' : 'Independent compatibility intelligence'}</small></div></div>
    <div className="report-actions"><button className="share-button" type="button" onClick={() => void copyText('link')}>{copied === 'link' ? <Check size={17} /> : <Copy size={17} />}{copied === 'link' ? 'Link copied' : 'Copy Link'}</button><button className="another-button" type="button" onClick={() => void copyText('summary')}>{copied === 'summary' ? <Check size={17} /> : <FileText size={16} />}{copied === 'summary' ? 'Summary copied' : 'Copy Summary'}</button><Link className="another-button" to="/verify">Verify Another Asset</Link></div>
    <CompatibilityScore result={report} />
    <ReportMetadata report={report} />
    <section className={`report-asset-source ${report.metadata?.sourceUrl ? '' : 'empty'}`}><div><p className="eyebrow">ASSET</p><h2>{report.metadata?.assetName || 'No listing metadata available'}</h2>{report.metadata?.publisherName ? <p>by {report.metadata.publisherName}</p> : !report.metadata?.assetName ? <p>This report uses the details entered during verification.</p> : null}</div>{report.metadata?.sourceUrl && <a href={report.metadata.sourceUrl} target="_blank" rel="noreferrer">View original listing ↗</a>}</section>
    <section className="report-summary"><p className="eyebrow">PRACTICAL SUMMARY</p><p>{report.summary}</p></section>
    <section className="top-checks"><div><p className="eyebrow">START HERE</p><h2>Check these first</h2></div>{topChecks.length ? <ol>{topChecks.map((check) => <li key={check.id}><span>{String(topChecks.indexOf(check) + 1).padStart(2, '0')}</span><div><strong>{check.category}</strong><p>{check.message}</p></div><em>{check.severity}</em></li>)}</ol> : <div className="launch-empty"><Check size={20} /><p>No major compatibility issues were found. Test this in a backup project first.</p></div>}</section>
    <details className="score-details"><summary>How this score was calculated</summary><div>{report.checks.map((check) => <div key={check.id}><span>{check.category} · {check.severity}</span><strong>{check.scoreImpact > 0 ? '+' : ''}{check.scoreImpact}</strong></div>)}</div></details>
    <div className="check-sections"><CheckSection title="Potential Issues" status="FAIL" checks={report.checks.filter((check) => check.status === 'FAIL')} /><CheckSection title="Warnings" status="WARNING" checks={report.checks.filter((check) => check.status === 'WARNING')} /><CheckSection title="Passed" status="PASS" checks={report.checks.filter((check) => check.status === 'PASS')} /></div>
    <RecommendationList recommendations={report.recommendations} />
    {demo ? <section className="demo-notice"><p>This is a static demo report. No verification, outcome, or analytics record is counted as production data.</p><Link className="button primary" to="/verify">Check your own asset</Link></section> : <><CommunityFeedback reportId={report.id} /><ReportUsefulness reportId={report.id} /></>}
    <ExploreCta />
  </main>;
}

function CheckSection({ title, status, checks }: { title: string; status: CheckStatus; checks: VerificationReport['checks'] }) {
  if (!checks.length) return null;
  return <section className="check-section"><div className="check-section-title"><h2>{title}</h2><span className={status.toLowerCase()}>{checks.length}</span></div><div className="check-list">{checks.map((check) => <CheckCard check={check} key={check.id} />)}</div></section>;
}
