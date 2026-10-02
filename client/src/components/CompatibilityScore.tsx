import type { VerifyResponse } from '../types/verify.types';

export function CompatibilityScore({ result }: { result: VerifyResponse }) {
  const label = result.score >= 90 ? 'Strong match' : result.score >= 80 ? 'Low setup risk' : result.score >= 55 ? 'Some checks recommended' : 'Higher setup risk';
  const riskColor = result.risk === 'LOW' ? '#12A873' : result.risk === 'MEDIUM' ? '#E2AD54' : '#EF7770';
  return <section className="score-panel" style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
    <div className="score-label" style={{marginBottom: '0'}}><span>COMPATIBILITY RESULT</span></div>
    <div className="score-content" style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem'}}>
      <h2 style={{color: riskColor, fontSize: '2.5rem', fontWeight: 700, margin: 0, textTransform: 'uppercase'}}>{result.risk} RISK</h2>
      <p style={{fontSize: '1.25rem', color: '#F2F2ED', margin: 0}}>{label}</p>
      <div className="score-wrap" style={{opacity: 0.7, fontSize: '1.5rem', marginTop: '0.5rem'}}><strong>{result.score}</strong><span> / 100</span></div>
    </div>
    <p className="disclaimer" style={{marginTop: '1rem', color: '#92978F'}}>AssetForge Verify provides a compatibility estimate based on listing information and details you provide. It does not replace testing the asset in your own project.</p>
  </section>;
}
