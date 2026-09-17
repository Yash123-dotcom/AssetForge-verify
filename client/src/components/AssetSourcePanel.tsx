import { ArrowRight, Check, Link2, LoaderCircle, TriangleAlert } from 'lucide-react';
import { KeyboardEvent, useState } from 'react';
import { trackEvent } from '../services/analytics';
import { analyzeAssetUrl } from '../services/verifyApi';
import type { AssetListingAnalysis } from '../types/verify.types';

type Props = {
  mode: 'URL' | 'MANUAL';
  onMode: (mode: 'URL' | 'MANUAL') => void;
  onAnalysis: (analysis: AssetListingAnalysis) => void;
  onManualFallback: (url: string, analysis: AssetListingAnalysis | null) => void;
};

export function AssetSourcePanel({ mode, onMode, onAnalysis, onManualFallback }: Props) {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'PARTIAL' | 'ERROR'>('IDLE');
  const [message, setMessage] = useState('');
  const [analysis, setAnalysis] = useState<AssetListingAnalysis | null>(null);

  async function analyze(isRetry = false) {
    if (!url.trim() || state === 'LOADING') return;
    const startedAt = performance.now();
    setState('LOADING'); setMessage('');
    if (isRetry) trackEvent('retry_after_error', { area: 'asset_analysis' });
    else trackEvent('asset_url_submitted');
    try {
      const result = await analyzeAssetUrl(url);
      const complete = Boolean(result.assetName && result.unityVersion && result.pipelineSupport.length);
      setAnalysis(result); setState(complete ? 'SUCCESS' : 'PARTIAL'); onAnalysis(result);
      trackEvent(complete ? 'asset_analysis_success' : 'asset_analysis_partial', { time_to_analysis_ms: Math.round(performance.now() - startedAt) });
    } catch (error) {
      setState('ERROR');
      setMessage(error instanceof Error ? error.message : "We couldn't read enough data from this listing.");
      trackEvent('asset_analysis_failed', { time_to_analysis_ms: Math.round(performance.now() - startedAt) });
    }
  }

  function analyzeOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') { event.preventDefault(); void analyze(); }
  }

  function useManualEntry() {
    onManualFallback(url.trim(), analysis);
    onMode('MANUAL');
  }

  return <div className="asset-source">
    <div className="source-tabs"><button type="button" aria-pressed={mode === 'URL'} className={mode === 'URL' ? 'selected' : ''} onClick={() => onMode('URL')}>Asset Store Link</button><button type="button" aria-pressed={mode === 'MANUAL'} className={mode === 'MANUAL' ? 'selected' : ''} onClick={() => onMode('MANUAL')}>Manual</button></div>
    {mode === 'URL' && <>
      <div className="url-analyzer"><label htmlFor="asset-url"><Link2 size={17} /> Paste Asset Store Link</label><div><input id="asset-url" type="url" value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={analyzeOnEnter} placeholder="https://assetstore.unity.com/packages/..." /><button type="button" onClick={() => void analyze()} disabled={!url.trim() || state === 'LOADING'}>{state === 'LOADING' ? <LoaderCircle className="spinner" /> : <ArrowRight />}<span>{state === 'LOADING' ? 'Analyzing…' : 'Analyze Asset'}</span></button></div></div>
      {state !== 'IDLE' && state !== 'LOADING' && <div className={`analysis-state ${state.toLowerCase()}`} role="status" aria-live="polite">{state === 'SUCCESS' ? <Check /> : <TriangleAlert />}<div><strong>{state === 'SUCCESS' ? 'Asset details found' : state === 'PARTIAL' ? 'Review the details we found.' : "We couldn't read enough data from this listing."}</strong><p>{state === 'ERROR' ? message : 'Review and confirm the editable fields below.'}</p>{analysis?.assetName && <span>{analysis.assetName}{analysis.publisherName ? ` · ${analysis.publisherName}` : ''}</span>}{state === 'ERROR' && <div className="analysis-actions"><button type="button" onClick={() => void analyze(true)}>Retry Analysis</button><button type="button" onClick={useManualEntry}>Enter details manually</button></div>}</div></div>}
      <p className="analysis-disclaimer">Listing details are detected automatically and may be incomplete. Review them before verifying.</p>
    </>}
    {mode === 'MANUAL' && <p className="manual-note">Enter the asset details manually below. The listing URL and any details already found are preserved.</p>}
  </div>;
}
