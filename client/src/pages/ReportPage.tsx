import { ArrowLeft, Check, Copy, LoaderCircle, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCard } from '../components/CheckCard';
import { CommunityFeedback } from '../components/CommunityFeedback';
import { CompatibilityScore } from '../components/CompatibilityScore';
import { ExploreCta } from '../components/ExploreCta';
import { RecommendationList } from '../components/RecommendationList';
import { ReportMetadata } from '../components/ReportMetadata';
import { getReport } from '../services/verifyApi';
import type { CheckStatus, VerificationReport } from '../types/verify.types';

export function ReportPage() {
  const { id } = useParams();
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.title = 'AssetForge Verify — Compatibility Report';
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    description?.setAttribute('content', 'Unity asset compatibility report generated with AssetForge Verify.');
    if (!id) { setNotFound(true); setLoading(false); return; }
    getReport(id).then((result) => {
      setReport(result);
      document.title = `AssetForge Verify — ${result.score}/100 ${result.risk} risk`;
    }).catch(() => setNotFound(true)).finally(() => setLoading(false));
  }, [id]);

  async function share() {
    try { await navigator.clipboard.writeText(window.location.href); }
    catch {
      const input = document.createElement('textarea'); input.value = window.location.href; input.style.position = 'fixed'; input.style.opacity = '0'; document.body.appendChild(input); input.select(); document.execCommand('copy'); input.remove();
    }
    setCopied(true); window.setTimeout(() => setCopied(false), 2200);
  }

  if (loading) return <main className="report-loading shell"><LoaderCircle className="spinner" /><p>Loading compatibility report…</p></main>;
  if (notFound || !report) return <main className="empty-report shell"><div><p className="eyebrow">REPORT NOT FOUND</p><h1>This report isn't available.</h1><p>It may have been removed, or the link might be incomplete.</p><Link className="button primary" to="/verify">Verify another asset</Link></div></main>;

  return <main className="report-page shell">
    <Link className="back-link" to="/verify"><ArrowLeft size={16} /> New verification</Link>
    <div className="report-heading"><div><p className="eyebrow">ANALYSIS COMPLETE</p><h1>Compatibility Report</h1></div><span className="report-id">ASSETFORGE VERIFY · V0.2</span></div>
    <div className="report-actions"><button className="share-button" type="button" onClick={share}>{copied ? <Check size={17} /> : <Share2 size={17} />}{copied ? 'Link copied' : 'Share Report'}</button><Link className="another-button" to="/verify"><Copy size={16} /> Verify Another Asset</Link></div>
    <CompatibilityScore result={report} />
    <ReportMetadata report={report} />
    {report.metadata?.sourceUrl && <section className="report-asset-source"><div><p className="eyebrow">ASSET</p><h2>{report.metadata.assetName || 'Unity Asset Store listing'}</h2>{report.metadata.publisherName && <p>by {report.metadata.publisherName}</p>}</div><a href={report.metadata.sourceUrl} target="_blank" rel="noreferrer">View original listing ↗</a></section>}
    <section className="report-summary"><p className="eyebrow">SUMMARY</p><p>{report.summary}</p></section><details className="score-details"><summary>How this score was calculated</summary><div>{report.checks.map((check) => <div key={check.id}><span>{check.category}</span><strong>{check.scoreImpact > 0 ? '+' : ''}{check.scoreImpact}</strong></div>)}</div></details>
    <div className="check-sections"><CheckSection title="Passed" status="PASS" checks={report.checks.filter((check) => check.status === 'PASS')} /><CheckSection title="Warnings" status="WARNING" checks={report.checks.filter((check) => check.status === 'WARNING')} /><CheckSection title="Potential Issues" status="FAIL" checks={report.checks.filter((check) => check.status === 'FAIL')} /></div>
    <RecommendationList recommendations={report.recommendations} />
    <CommunityFeedback reportId={report.id} />
    <ExploreCta />
  </main>;
}

function CheckSection({ title, status, checks }: { title: string; status: CheckStatus; checks: VerificationReport['checks'] }) {
  if (!checks.length) return null;
  return <section className="check-section"><div className="check-section-title"><h2>{title}</h2><span className={status.toLowerCase()}>{checks.length}</span></div><div className="check-list">{checks.map((check) => <CheckCard check={check} key={check.id} />)}</div></section>;
}
