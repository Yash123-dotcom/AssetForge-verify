import { Info } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AssetSetupForm } from '../components/AssetSetupForm';
import { AssetSourcePanel } from '../components/AssetSourcePanel';
import { ProjectSetupForm } from '../components/ProjectSetupForm';
import { VerifyButton } from '../components/VerifyButton';
import { trackEvent } from '../services/analytics';
import { verifyAsset } from '../services/verifyApi';
import type { AssetListingAnalysis, VerifyRequest } from '../types/verify.types';

const initial: VerifyRequest = { project: { unityVersion: '', pipeline: '', platform: '' }, asset: { testedUnityVersion: '', pipeline: '', customShaders: false, dependencies: [] } };
export function VerifyPage() {
  const [form, setForm] = useState<VerifyRequest>(initial); const [mode, setMode] = useState<'URL'|'MANUAL'>('URL'); const [loading, setLoading] = useState(false); const [showErrors, setShowErrors] = useState(false); const [error, setError] = useState(''); const navigate = useNavigate();
  const valid = Boolean(form.project.unityVersion && form.project.pipeline && form.project.platform && form.asset.testedUnityVersion && form.asset.pipeline);
  async function submit(event: FormEvent) { event.preventDefault(); setShowErrors(true); setError(''); if (!valid) return; setLoading(true); trackEvent('verification_started', { source: mode }); try { const result = await verifyAsset(form); trackEvent('report_created'); navigate(`/report/${result.id}`); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.'); } finally { setLoading(false); } }
  function applyAnalysis(analysis: AssetListingAnalysis) { setForm((current) => ({ ...current, asset: { ...current.asset, testedUnityVersion: analysis.unityVersion ?? current.asset.testedUnityVersion, pipeline: analysis.pipelineSupport[0] ?? current.asset.pipeline, customShaders: analysis.customShaders === 'UNKNOWN' ? current.asset.customShaders : analysis.customShaders, dependencies: analysis.dependencies, metadata: { assetName: analysis.assetName ?? undefined, publisherName: analysis.publisherName ?? undefined, sourceUrl: analysis.url, source: analysis.source, metadataSource: 'URL_ANALYSIS' } } })); }
  function tryExample() { setMode('MANUAL'); setForm({ project: { unityVersion: '6000', pipeline: 'URP', platform: 'WINDOWS' }, asset: { testedUnityVersion: '2022', pipeline: 'URP', customShaders: true, dependencies: ['Cinemachine'], metadata: { assetName: 'Stylized Fire Shader', publisherName: 'Example Studio', metadataSource: 'MANUAL' } } }); }
  return <main className="verify-page shell">
    <div className="page-heading"><div><p className="eyebrow">COMPATIBILITY CHECK / 001</p><h1>Verify a<br /><span>Unity asset.</span></h1></div><div className="page-heading-copy"><p>Compare an asset against your current Unity project setup. Get a clear, shareable compatibility report before you import.</p><button className="try-example" type="button" onClick={tryExample}>Load example setup</button></div></div>
    <div className="verify-workspace">
      <aside className="workflow-rail" aria-label="Verification workflow">
        <p className="eyebrow">REPORT INPUTS</p>
        <ol><li><span>01</span><div><strong>Project</strong><small>Your target environment</small></div></li><li><span>02</span><div><strong>Asset</strong><small>Listing or manual details</small></div></li><li><span>03</span><div><strong>Compare</strong><small>Five focused checks</small></div></li></ol>
        <div className="privacy-note"><span aria-hidden="true" /><p><strong>No package upload</strong>Your Unity project and asset files stay with you.</p></div>
      </aside>
      <div className="verify-flow">
        <div className="limitation"><Info size={17} /><p>Asset URL analysis uses public listing details and may be incomplete. Verify does not inspect or download the asset package.</p></div>
        <form onSubmit={submit} noValidate><ProjectSetupForm value={form.project} onChange={(project) => setForm({ ...form, project })} showErrors={showErrors} /><AssetSourcePanel mode={mode} onMode={setMode} onAnalysis={applyAnalysis} /><AssetSetupForm value={form.asset} onChange={(asset) => { if (form.asset.metadata && JSON.stringify(asset) !== JSON.stringify(form.asset)) trackEvent('metadata_corrected'); setForm({ ...form, asset }); }} showErrors={showErrors} />{error && <div className="form-error" role="alert">{error}</div>}<div className="submit-row"><p><span>05</span> focused checks · Heuristic result</p><VerifyButton loading={loading} disabled={!valid} /></div></form>
      </div>
    </div>
  </main>;
}
