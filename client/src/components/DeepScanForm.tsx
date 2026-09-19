import { FileArchive, LoaderCircle, ShieldCheck, Upload, X } from 'lucide-react';
import { DragEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { trackEvent } from '../services/analytics';
import { deepScanPackage, getCreditBalance } from '../services/verifyApi';
import type { VerificationReport, VerifyRequest } from '../types/verify.types';
import { ProjectSetupForm } from './ProjectSetupForm';
import { Link } from 'react-router-dom';
import { useAuth } from './auth-context';

type Props = {
  project: VerifyRequest['project'];
  onProjectChange: (project: VerifyRequest['project']) => void;
  onStarted: () => void;
  onCompleted: (report: VerificationReport) => void;
};

const configuredClientLimitMb = Number(import.meta.env.VITE_MAX_PACKAGE_SIZE_MB || 250);
const clientLimitMb = Number.isFinite(configuredClientLimitMb) && configuredClientLimitMb > 0 ? configuredClientLimitMb : 250;

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DeepScanForm({ project, onProjectChange, onStarted, onCompleted }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const paywallTracked = useRef(false);
  const submitting = useRef(false);
  const [file, setFile] = useState<File | null>(null); const [dragging, setDragging] = useState(false); const [showErrors, setShowErrors] = useState(false);
  const [phase, setPhase] = useState<'IDLE' | 'UPLOADING' | 'INSPECTING' | 'ERROR'>('IDLE'); const [uploadRatio, setUploadRatio] = useState(0); const [error, setError] = useState('');
  const [availableCredits, setAvailableCredits] = useState<number | null>(null); const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const validProject = Boolean(project.unityVersion && project.pipeline && project.platform);
  useEffect(() => {
    const refreshBalance = () => { if (user) void getCreditBalance().then((balance) => setAvailableCredits(balance.availableCredits)).catch(() => setAvailableCredits(null)); else setAvailableCredits(null); };
    refreshBalance(); window.addEventListener('focus', refreshBalance);
    return () => window.removeEventListener('focus', refreshBalance);
  }, [user]);
  useEffect(() => { if (file && validProject && !paywallTracked.current) { paywallTracked.current = true; trackEvent('deep_scan_paywall_seen'); } }, [file, validProject]);

  function chooseFile(candidate?: File) {
    if (!candidate || busy) return;
    onStarted(); setError('');
    const lower = candidate.name.toLowerCase();
    if (!lower.endsWith('.unitypackage') && !lower.endsWith('.tar.gz')) { setFile(null); setError('Choose a .unitypackage file.'); return; }
    if (candidate.size === 0) { setFile(null); setError('Choose a non-empty Unity package.'); return; }
    if (candidate.size > clientLimitMb * 1024 * 1024) { setFile(null); setError('This package is larger than the current Deep Scan limit.'); return; }
    setFile(candidate); setIdempotencyKey(crypto.randomUUID());
  }

  function drop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]); }

  async function submit(event: FormEvent) {
    event.preventDefault(); setShowErrors(true); setError('');
    if (!file || !validProject || phase === 'UPLOADING' || phase === 'INSPECTING' || submitting.current) return;
    submitting.current = true;
    const startedAt = performance.now(); onStarted(); setPhase('UPLOADING'); setUploadRatio(0); trackEvent('deep_scan_started', { package_size_mb: Math.round(file.size / 1024 / 1024) });
    try {
      const result = await deepScanPackage(file, project, idempotencyKey, (ratio) => { setUploadRatio(ratio); if (ratio >= 1) setPhase('INSPECTING'); });
      setAvailableCredits(result.availableCredits);
      trackEvent('deep_scan_completed', { duration_ms: Math.round(performance.now() - startedAt), file_count: result.scan.package.totalFiles });
      onCompleted(result.report);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Deep Scan could not inspect this package.';
      setError(message); setPhase('ERROR');
      trackEvent(message.includes('too long') ? 'deep_scan_timed_out' : 'deep_scan_failed', { duration_ms: Math.round(performance.now() - startedAt) });
    } finally { submitting.current = false; }
  }

  const busy = phase === 'UPLOADING' || phase === 'INSPECTING';
  return <form className="deep-scan-form" onSubmit={submit} noValidate>
    <ProjectSetupForm value={project} onChange={(next) => { onStarted(); onProjectChange(next); }} showErrors={showErrors} />
    <section className="form-card deep-scan-card"><div className="form-card-heading"><span className="icon-box"><FileArchive size={19} /></span><div><p className="eyebrow">PACKAGE / STATIC INSPECTION</p><h2>Upload Unity Package</h2></div><span className="deep-beta" title="Static package inspection is still being improved.">Deep Scan — Beta</span></div>
      <div className={`package-dropzone ${dragging ? 'dragging' : ''} ${busy ? 'disabled' : ''}`} onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop} onClick={() => { if (!busy) inputRef.current?.click(); }} role="button" tabIndex={busy ? -1 : 0} onKeyDown={(event) => { if (!busy && (event.key === 'Enter' || event.key === ' ')) inputRef.current?.click(); }} aria-label="Choose a Unity package" aria-disabled={busy}>
        <input ref={inputRef} type="file" accept=".unitypackage,.tar.gz" onChange={(event) => chooseFile(event.target.files?.[0])} disabled={busy} hidden />
        <Upload size={26} /><strong>Drop a .unitypackage here</strong><span>or choose a file · up to {clientLimitMb} MB</span>
      </div>
      {file && <div className="selected-package"><FileArchive size={20} /><div><strong>{file.name}</strong><span>{formatBytes(file.size)}</span></div><button type="button" aria-label="Remove selected package" disabled={busy} onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ''; }}><X size={17} /></button></div>}
      <div className="static-safety"><ShieldCheck size={18} /><p><strong>Static inspection only.</strong> Uploaded code is never executed. Packages are processed temporarily and deleted after analysis.</p></div>
      <details className="deep-privacy"><summary>How Deep Scan works</summary><p>The server reads archive structure and bounded text signals without running Unity, scripts, shaders, or DLLs. The uploaded package is kept only in temporary processing storage and removed after the request; only the normalized report is saved.</p></details>
      {file && validProject && !busy && <div className="credit-confirm"><div><p className="eyebrow">READY FOR DEEP SCAN</p><strong>This scan will use 1 credit</strong><span>{user ? `Current balance: ${availableCredits ?? '…'} credits` : 'Sign in to use Deep Scan credits.'}</span></div>{!user ? <Link to="/login" state={{ from: '/verify' }}>Sign In</Link> : availableCredits === 0 ? <Link to="/pricing" onClick={() => trackEvent('deep_scan_purchase_prompt_clicked')}>Buy Credits</Link> : null}</div>}
      {busy && <div className="scan-status" aria-live="polite"><div className="scan-status-head"><LoaderCircle className="spinner" /><strong>{phase === 'UPLOADING' ? 'Uploading package' : 'Inspecting package and building report'}</strong></div>{phase === 'UPLOADING' && <div className="upload-track" role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(uploadRatio * 100)}><span style={{ width: `${Math.round(uploadRatio * 100)}%` }} /></div>}<p>{phase === 'INSPECTING' ? 'Reading archive structure, shaders, scripts, dependencies, and package metadata.' : 'The scan starts after the upload completes.'}</p></div>}
      {error && <div className="form-error" role="alert"><p>{error}</p>{phase === 'ERROR' && <button type="submit" onClick={() => trackEvent('retry_after_error', { area: 'deep_scan' })}>Retry Deep Scan</button>}</div>}
    </section>
    <div className="submit-row"><p><span>1 CREDIT</span> per Deep Scan · Quick Check remains free</p><button className="verify-button" disabled={!file || !validProject || busy || !user || availableCredits === null || availableCredits < 1}>{busy ? <><LoaderCircle className="spinner" /> Scanning…</> : 'Use 1 Credit & Scan'}</button></div>
  </form>;
}
