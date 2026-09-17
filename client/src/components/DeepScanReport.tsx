import { Check, FileArchive, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { DeepScanResult } from '../types/verify.types';

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function DeepScanReport({ scan }: { scan: DeepScanResult }) {
  const composition = [
    ['Files', scan.package.totalFiles], ['Scripts', scan.composition.scripts], ['Shaders', scan.composition.shaders], ['Materials', scan.composition.materials], ['Textures', scan.composition.textures], ['Prefabs', scan.composition.prefabs], ['Scenes', scan.composition.scenes], ['Models', scan.composition.models], ['Audio', scan.composition.audio],
  ];
  const technologies = Array.from(new Set([...scan.detected.pipelineSignals, ...scan.detected.dependencies, ...scan.detected.shaderTechnologies, ...(scan.detected.asmdefPresent ? ['Assembly Definitions'] : []), ...(scan.detected.dllPresent ? ['Precompiled DLL'] : [])]));
  return <section className="deep-report">
    <div className="deep-report-header"><div><p className="eyebrow">DEEP SCAN / STATIC INSPECTION</p><h2>Package inspected</h2><p>Based on package structure and bounded text signals. No scripts, shaders, or binaries were executed.</p></div><span title="Static package inspection is still being improved.">Deep Scan — Beta</span></div>
    <div className="package-overview"><div className="package-name"><FileArchive size={22} /><div><strong>{scan.package.fileName}</strong><span>{formatBytes(scan.package.sizeBytes)} uploaded · {formatBytes(scan.package.totalExtractedBytes)} inspected</span></div></div><div className="composition-grid">{composition.map(([label, value]) => <div key={label}><strong>{Number(value).toLocaleString()}</strong><span>{label}</span></div>)}</div></div>
    <div className="detected-tech"><p className="eyebrow">DETECTED TECHNOLOGIES</p>{technologies.length ? <div>{technologies.map((item) => <span key={item}>{item}</span>)}</div> : <p>Not enough package evidence to identify specific technologies.</p>}</div>
    <div className="deep-findings"><div className="deep-findings-title"><p className="eyebrow">DEEP SCAN FINDINGS</p><ShieldCheck size={20} /></div><div>{scan.risks.map((risk) => <article className={`deep-risk severity-${risk.severity.toLowerCase()}`} key={risk.id}>{risk.severity === 'INFO' || risk.severity === 'LOW' ? <Check size={17} /> : <TriangleAlert size={17} />}<div><div><strong>{risk.title}</strong><span>{risk.severity}</span></div><p>{risk.message}</p>{risk.recommendation && <small>{risk.recommendation}</small>}</div></article>)}</div></div>
  </section>;
}
