import { Check, LoaderCircle, MessageSquareText } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { getFeedbackSummary, sendFeedback } from '../services/verifyApi';
import type { FeedbackOutcome, FeedbackSummary } from '../types/verify.types';

const outcomes: { value: FeedbackOutcome; label: string }[] = [
  { value: 'WORKED', label: 'Yes' }, { value: 'PARTIAL', label: 'Partially' }, { value: 'FAILED', label: 'No' },
];

export function CommunityFeedback({ reportId }: { reportId: string }) {
  const storageKey = `assetforge-feedback:${reportId}`;
  const [selected, setSelected] = useState<FeedbackOutcome | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(() => localStorage.getItem(storageKey) === 'submitted');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);

  useEffect(() => { getFeedbackSummary(reportId).then(setSummary).catch(() => undefined); }, [reportId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected || submitted) return;
    setSending(true); setError('');
    try {
      await sendFeedback(reportId, selected, comment);
      localStorage.setItem(storageKey, 'submitted'); setSubmitted(true);
      setSummary((current) => current ? { ...current, totalResponses: current.totalResponses + 1, worked: current.worked + (selected === 'WORKED' ? 1 : 0), partial: current.partial + (selected === 'PARTIAL' ? 1 : 0), failed: current.failed + (selected === 'FAILED' ? 1 : 0) } : null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not send your feedback.'); }
    finally { setSending(false); }
  }

  return <section className="community-section"><div className="community-heading"><div><p className="eyebrow">COMMUNITY FEEDBACK</p><h2>Did this asset work in your project?</h2><p>Share what happened after import. This is community input, not a compatibility guarantee.</p></div><MessageSquareText /></div>
    {summary && summary.totalResponses >= 3 && <div className="community-stats"><div className="stats-lead"><strong>{summary.totalResponses}</strong><span>developers shared feedback for this report</span></div><div><strong>{summary.worked}</strong><span>Worked</span></div><div><strong>{summary.partial}</strong><span>Partially worked</span></div><div><strong>{summary.failed}</strong><span>Failed</span></div></div>}
    {submitted ? <div className="feedback-thanks"><Check size={19} /><div><strong>Thanks — this helps improve AssetForge Verify.</strong><span>Your feedback has been recorded for this report.</span></div></div> : <form className="feedback-form" onSubmit={submit}><div className="outcome-buttons">{outcomes.map((outcome) => <button type="button" key={outcome.value} aria-pressed={selected === outcome.value} className={selected === outcome.value ? 'selected' : ''} onClick={() => setSelected(outcome.value)}>{outcome.label}</button>)}</div>{selected && <label className="feedback-comment" htmlFor="feedback-comment"><span>What happened? <small>Optional</small></span><textarea id="feedback-comment" maxLength={500} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Example: Materials worked, but one custom shader broke in URP." /><small>{comment.length}/500</small></label>}{error && <p className="feedback-error" role="alert">{error}</p>}{selected && <button className="feedback-submit" type="submit" disabled={sending}>{sending ? <><LoaderCircle className="spinner" size={17} /> Sending…</> : 'Send Feedback'}</button>}</form>}
  </section>;
}
