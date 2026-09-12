import type { VerifyResponse } from '../types/verify.types';
import { RiskBadge } from './RiskBadge';

export function CompatibilityScore({ result }: { result: VerifyResponse }) {
  const label = result.score >= 90 ? 'Strong match' : result.score >= 80 ? 'Low setup risk' : result.score >= 55 ? 'Some checks recommended' : 'Higher setup risk';
  return <section className="score-panel"><div className="score-label"><span>ASSETFORGE COMPATIBILITY SCORE</span><span>AFV / RESULT</span></div><div className="score-content"><div><div className="score-wrap"><strong>{result.score}</strong><span>/100</span></div><p className="score-band">{label}</p></div><div className="score-context"><RiskBadge risk={result.risk} /><p className="disclaimer">AssetForge Verify provides a compatibility estimate based on listing information and details you provide. It does not replace testing the asset in your own project.</p></div></div></section>;
}
