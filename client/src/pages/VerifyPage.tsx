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
  return <main className="verify-page shell"><div className="page-heading"><p className="eyebrow">COMPATIBILITY CHECK</p><h1>Verify a Unity asset</h1><p>Compare an asset against your current Unity project setup.</p><button className="try-example" type="button" onClick={tryExample}>Try an example</button></div><div className="limitation"><Info size={17} /><p>Asset URL analysis uses public listing details and may be incomplete. Verify does not inspect or download the asset package.</p></div><form onSubmit={submit} noValidate><ProjectSetupForm value={form.project} onChange={(project) => setForm({ ...form, project })} showErrors={showErrors} /><AssetSourcePanel mode={mode} onMode={setMode} onAnalysis={applyAnalysis} /><AssetSetupForm value={form.asset} onChange={(asset) => { if (form.asset.metadata && JSON.stringify(asset) !== JSON.stringify(form.asset)) trackEvent('metadata_corrected'); setForm({ ...form, asset }); }} showErrors={showErrors} />{error && <div className="form-error" role="alert">{error}</div>}<div className="submit-row"><p><span>5</span> focused checks · Heuristic result</p><VerifyButton loading={loading} disabled={!valid} /></div></form></main>;
}
