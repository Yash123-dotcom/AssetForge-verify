import { Info } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AssetSetupForm } from '../components/AssetSetupForm';
import { AssetSourcePanel } from '../components/AssetSourcePanel';
import { BetaBadge } from '../components/BetaBadge';
import { ProjectSetupForm } from '../components/ProjectSetupForm';
import { VerifyButton } from '../components/VerifyButton';
import { DeepScanForm } from '../components/DeepScanForm';
import { trackEvent } from '../services/analytics';
import { verifyAsset } from '../services/verifyApi';
import type { AssetListingAnalysis, VerifyRequest } from '../types/verify.types';

const initial: VerifyRequest = { project: { unityVersion: '', pipeline: '', platform: '' }, asset: { testedUnityVersion: '', pipeline: '', customShaders: false, dependencies: [] } };

export function VerifyPage() {
  const [form, setForm] = useState<VerifyRequest>(initial);
  const [verificationMode, setVerificationMode] = useState<'QUICK' | 'DEEP'>('QUICK');
  const [mode, setMode] = useState<'URL' | 'MANUAL'>('URL');
  const [loading, setLoading] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const started = useRef(false); const submitted = useRef(false); const abandoned = useRef(false);
  const valid = Boolean(form.project.unityVersion && form.project.pipeline && form.project.platform && form.asset.testedUnityVersion && form.asset.pipeline);

  useEffect(() => () => {
    if (started.current && !submitted.current && !abandoned.current) {
      abandoned.current = true;
      trackEvent('verify_abandoned');
    }
  }, []);

  function markStarted() { started.current = true; }

  async function submit(event: FormEvent) {
    event.preventDefault(); setShowErrors(true); setError(''); markStarted();
    if (!valid) return;
    const startedAt = performance.now();
    setLoading(true); trackEvent('verification_started', { source: mode });
    try {
      const result = await verifyAsset(form);
      submitted.current = true;
      trackEvent('report_created', { time_to_report_ms: Math.round(performance.now() - startedAt) });
      navigate(`/report/${result.id}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The verification could not be completed. Please retry.'); }
    finally { setLoading(false); }
  }

  function applyAnalysis(analysis: AssetListingAnalysis) {
    markStarted();
    setForm((current) => ({ ...current, asset: { ...current.asset, testedUnityVersion: analysis.unityVersion ?? current.asset.testedUnityVersion, pipeline: analysis.pipelineSupport[0] ?? current.asset.pipeline, customShaders: analysis.customShaders === 'UNKNOWN' ? current.asset.customShaders : analysis.customShaders, dependencies: analysis.dependencies, metadata: { assetName: analysis.assetName ?? undefined, publisherName: analysis.publisherName ?? undefined, sourceUrl: analysis.url, source: analysis.source, metadataSource: 'URL_ANALYSIS', fieldConfidence: { unityVersion: analysis.unityVersion ? analysis.confidence.unityVersion : 'UNKNOWN', pipeline: analysis.pipelineSupport.length ? analysis.confidence.pipeline : 'UNKNOWN', dependencies: analysis.confidence.dependencies, shaders: analysis.customShaders === 'UNKNOWN' ? 'UNKNOWN' : analysis.confidence.shaders } } } }));
  }

  function manualFallback(url: string, analysis: AssetListingAnalysis | null) {
    markStarted();
    setForm((current) => ({ ...current, asset: { ...current.asset, metadata: { ...current.asset.metadata, sourceUrl: url || current.asset.metadata?.sourceUrl, source: url ? 'UNITY_ASSET_STORE' : current.asset.metadata?.source, assetName: analysis?.assetName ?? current.asset.metadata?.assetName, publisherName: analysis?.publisherName ?? current.asset.metadata?.publisherName, metadataSource: 'USER' } } }));
  }

  function updateAsset(asset: VerifyRequest['asset']) {
    markStarted();
    const confidence = { ...form.asset.metadata?.fieldConfidence };
    if (asset.testedUnityVersion !== form.asset.testedUnityVersion) confidence.unityVersion = 'USER';
    if (asset.pipeline !== form.asset.pipeline) confidence.pipeline = 'USER';
    if (asset.customShaders !== form.asset.customShaders) confidence.shaders = 'USER';
    if (JSON.stringify(asset.dependencies) !== JSON.stringify(form.asset.dependencies)) confidence.dependencies = 'USER';
    const changed = JSON.stringify(asset) !== JSON.stringify(form.asset);
    if (form.asset.metadata && changed) trackEvent('metadata_corrected');
    setForm({ ...form, asset: { ...asset, metadata: asset.metadata ? { ...asset.metadata, metadataSource: changed ? 'USER' : asset.metadata.metadataSource, fieldConfidence: confidence } : undefined } });
  }

  function tryExample() {
    markStarted(); setMode('MANUAL');
    setForm({ project: { unityVersion: '6000', pipeline: 'URP', platform: 'WINDOWS' }, asset: { testedUnityVersion: '2022', pipeline: 'URP', customShaders: true, dependencies: ['Cinemachine'], metadata: { assetName: 'Stylized Fire Shader', publisherName: 'Example Studio', metadataSource: 'USER', fieldConfidence: { unityVersion: 'USER', pipeline: 'USER', dependencies: 'USER', shaders: 'USER' } } } });
  }

  return <main className="verify-page shell">
    <div className="page-heading"><div><p className="eyebrow">COMPATIBILITY CHECK / 001</p><h1>Check this asset<br /><span>before importing.</span></h1></div><div className="page-heading-copy"><BetaBadge /><p>{verificationMode === 'QUICK' ? 'Analyze listing information and project compatibility.' : 'Inspect an asset package for deeper compatibility signals before importing.'}</p>{verificationMode === 'QUICK' && <button className="try-example" type="button" onClick={tryExample}>Load example setup</button>}</div></div>
    <div className="verification-mode" role="group" aria-label="Verification mode"><button type="button" className={verificationMode === 'QUICK' ? 'selected' : ''} aria-pressed={verificationMode === 'QUICK'} onClick={() => setVerificationMode('QUICK')}><strong>Quick Check</strong><span>Listing and manual metadata</span></button><button type="button" className={verificationMode === 'DEEP' ? 'selected' : ''} aria-pressed={verificationMode === 'DEEP'} onClick={() => setVerificationMode('DEEP')}><strong>Deep Scan</strong><span>Static package inspection</span><em>Beta</em></button></div>
    {verificationMode === 'DEEP' ? <div className="deep-scan-shell"><DeepScanForm project={form.project} onProjectChange={(project) => setForm({ ...form, project })} onStarted={markStarted} onCompleted={(report) => { submitted.current = true; navigate(`/report/${report.id}`); }} /></div> : <div className="verify-workspace">
      <aside className="workflow-rail" aria-label="Verification workflow"><p className="eyebrow">REPORT INPUTS</p><ol><li><span>01</span><div><strong>Project</strong><small>Your target environment</small></div></li><li><span>02</span><div><strong>Asset</strong><small>Listing or manual details</small></div></li><li><span>03</span><div><strong>Compare</strong><small>Five focused checks</small></div></li></ol><div className="privacy-note"><span aria-hidden="true" /><p><strong>No package upload</strong>Your Unity project and asset files stay with you.</p></div></aside>
      <div className="verify-flow"><div className="limitation"><Info size={17} /><p>Listing analysis uses public metadata and may be incomplete. Verify does not download the asset package.</p></div>
        <form onSubmit={submit} noValidate><ProjectSetupForm value={form.project} onChange={(project) => { markStarted(); setForm({ ...form, project }); }} showErrors={showErrors} /><AssetSourcePanel mode={mode} onMode={(nextMode) => { markStarted(); setMode(nextMode); }} onAnalysis={applyAnalysis} onManualFallback={manualFallback} /><AssetSetupForm value={form.asset} onChange={updateAsset} showErrors={showErrors} />{error && <div className="form-error" role="alert"><p>{error}</p><button type="submit" onClick={() => trackEvent('retry_after_error', { area: 'verification' })}>Retry</button></div>}<div className="submit-row"><p><span>05</span> focused checks · Heuristic result</p><VerifyButton loading={loading} disabled={!valid} /></div></form>
      </div>
    </div>}
  </main>;
}
