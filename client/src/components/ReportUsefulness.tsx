import { Check, LoaderCircle } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { trackEvent } from '../services/analytics';
import { sendUsefulness } from '../services/verifyApi';
import type { UsefulnessRating } from '../types/verify.types';

const ratings: { value: UsefulnessRating; label: string }[] = [{ value: 'YES', label: 'Yes' }, { value: 'SOMEWHAT', label: 'Somewhat' }, { value: 'NO', label: 'No' }];

export function ReportUsefulness({ reportId }: { reportId: string }) {
  const key = `assetforge-usefulness:${reportId}`;
  const [rating, setRating] = useState<UsefulnessRating | null>(null); const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(() => localStorage.getItem(key) === 'submitted'); const [sending, setSending] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!rating || submitted) return; setSending(true); setError('');
    try { await sendUsefulness(reportId, rating, comment); localStorage.setItem(key, 'submitted'); setSubmitted(true); trackEvent('usefulness_submitted', { rating }); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not send this rating.'); }
    finally { setSending(false); }
  }
  return <section className="usefulness-section"><p className="eyebrow">REPORT QUALITY</p><h2>Was this report useful?</h2>{submitted ? <div className="feedback-thanks"><Check size={19} /><strong>Thanks for rating this report.</strong></div> : <form onSubmit={submit}><div className="outcome-buttons">{ratings.map((item) => <button type="button" key={item.value} className={rating === item.value ? 'selected' : ''} aria-pressed={rating === item.value} onClick={() => setRating(item.value)}>{item.label}</button>)}</div>{rating && <label className="feedback-comment" htmlFor="usefulness-comment"><span>What would make this more useful? <small>Optional</small></span><textarea id="usefulness-comment" maxLength={500} value={comment} onChange={(event) => setComment(event.target.value)} /><small>{comment.length}/500</small></label>}{error && <p className="feedback-error" role="alert">{error}</p>}{rating && <button className="feedback-submit" disabled={sending}>{sending ? <><LoaderCircle className="spinner" size={17} /> Sending…</> : 'Send Rating'}</button>}</form>}</section>;
}
