import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '../services/analytics';

const STORAGE_KEY = 'assetforge-beta-onboarding:v0.5';

export function BetaOnboarding() {
  const [open, setOpen] = useState(() => localStorage.getItem(STORAGE_KEY) !== 'dismissed');
  const dialogRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    trackEvent('beta_started');
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>('button')?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button, a[href]'));
      if (!controls.length) return;
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previousFocus?.focus(); };
  }, [open]);

  function continueTo(path: string) {
    localStorage.setItem(STORAGE_KEY, 'dismissed');
    setOpen(false);
    navigate(path);
  }

  if (!open) return null;
  return <div className="beta-modal-backdrop" role="presentation">
    <div className="beta-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="beta-modal-title" aria-describedby="beta-modal-description">
      <span className="beta-modal-kicker">PRIVATE BETA / v0.5</span>
      <h2 id="beta-modal-title">AssetForge Verify is in private beta.</h2>
      <p id="beta-modal-description">Check an asset before importing. Verify is learning from real-world Unity setups while keeping every result transparent.</p>
      <ul><li>Paste a Unity Asset Store listing</li><li>Tell us your project setup</li><li>Review compatibility risks before import</li></ul>
      <div><button type="button" className="button primary" onClick={() => continueTo('/verify')}>Start Verifying</button><button type="button" className="button secondary" onClick={() => continueTo('/demo')}>Try Demo</button></div>
    </div>
  </div>;
}
