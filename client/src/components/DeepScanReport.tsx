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
  const signalSections = [
    ['Shader Findings', scan.composition.shaders ? `${scan.composition.shaders} shader files detected${scan.detected.shaderTechnologies.length ? ` · ${scan.detected.shaderTechnologies.join(', ')}` : ''}.` : 'No shader files were detected.'],
    ['Script Signals', scan.composition.scripts ? `${scan.composition.scripts} scripts inspected. ${scan.detected.findings.filter((item) => /script|editor|api/i.test(item)).join(' ') || 'No additional script warning signals were found.'}` : 'No C# scripts were detected.'],
    ['Dependency Analysis', scan.detected.dependencies.length ? scan.detected.dependencies.join(', ') : 'No known dependency signals were found. Absence is not confirmation that the package has no dependencies.'],
    ['Render Pipeline Signals', scan.detected.pipelineSignals.length ? scan.detected.pipelineSignals.join(', ') : 'No render pipeline could be identified with sufficient confidence.'],
    ['Binary / DLL Indicators', scan.detected.dllPresent ? 'Precompiled DLL content is present. Binaries were identified but never loaded or executed.' : 'No DLL files were detected.'],
    ['Documentation Signals', scan.detected.documentationPresent ? `${scan.composition.documentationFiles} apparent documentation or setup files detected.` : 'No obvious setup documentation was detected.'],
  ];
  return <section className="deep-report">
    <div className="deep-report-header"><div><p className="eyebrow">DEEP SCAN / STATIC INSPECTION</p><h2>Package inspected</h2><p>Based on package structure and bounded text signals. No scripts, shaders, or binaries were executed.</p></div><span title="Static package inspection is still being improved.">Deep Scan — Beta</span></div>
    <div className="package-overview"><div className="package-name"><FileArchive size={22} /><div><strong>{scan.package.fileName}</strong><span>{formatBytes(scan.package.sizeBytes)} uploaded · {formatBytes(scan.package.totalExtractedBytes)} inspected</span></div></div><div className="composition-grid">{composition.map(([label, value]) => <div key={label}><strong>{Number(value).toLocaleString()}</strong><span>{label}</span></div>)}</div></div>
    <div className="detected-tech"><p className="eyebrow">DETECTED TECHNOLOGIES</p>{technologies.length ? <div>{technologies.map((item) => <span key={item}>{item}</span>)}</div> : <p>Not enough package evidence to identify specific technologies.</p>}</div>
    <div className="signal-analysis">{signalSections.map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div>
    <div className="deep-findings"><div className="deep-findings-title"><div><p className="eyebrow">TOP COMPATIBILITY RISKS</p><h2>Recommended actions</h2></div><ShieldCheck size={20} /></div><div>{scan.risks.map((risk) => <article className={`deep-risk severity-${risk.severity.toLowerCase()}`} key={risk.id}>{risk.severity === 'INFO' || risk.severity === 'LOW' ? <Check size={17} /> : <TriangleAlert size={17} />}<div><div><strong>{risk.title}</strong><span>{risk.severity}</span></div><p>{risk.message}</p>{risk.recommendation && <small>{risk.recommendation}</small>}</div></article>)}</div></div>
  </section>;
}
