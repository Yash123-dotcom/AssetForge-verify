import { Check, LoaderCircle, MessageSquareText } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { trackEvent } from '../services/analytics';
import { getFeedbackSummary, sendFeedback } from '../services/verifyApi';
import type { FeedbackCategory, FeedbackOutcome, FeedbackSummary } from '../types/verify.types';

const outcomes: { value: FeedbackOutcome; label: string }[] = [
  { value: 'WORKED', label: 'Worked' }, { value: 'PARTIAL', label: 'Partially worked' }, { value: 'FAILED', label: 'Failed' },
];
const categories: { value: FeedbackCategory; label: string }[] = [
  { value: 'RENDER_PIPELINE', label: 'Render pipeline' }, { value: 'UNITY_VERSION', label: 'Unity version' }, { value: 'SHADERS_MATERIALS', label: 'Shaders/materials' }, { value: 'DEPENDENCIES', label: 'Dependencies' }, { value: 'MISSING_SCRIPTS', label: 'Missing scripts' }, { value: 'PLATFORM_SPECIFIC', label: 'Platform-specific issue' }, { value: 'OTHER', label: 'Other' },
];
const prompts: Record<FeedbackOutcome, string> = { WORKED: 'What worked well?', PARTIAL: 'What needed fixing?', FAILED: 'What went wrong?' };

export function CommunityFeedback({ reportId }: { reportId: string }) {
  const storageKey = `assetforge-feedback:${reportId}`;
  const [selected, setSelected] = useState<FeedbackOutcome | null>(null);
  const [category, setCategory] = useState<FeedbackCategory | ''>('');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(() => localStorage.getItem(storageKey) === 'submitted');
  const [sending, setSending] = useState(false); const [error, setError] = useState('');
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);

  useEffect(() => { getFeedbackSummary(reportId).then(setSummary).catch(() => undefined); }, [reportId]);

  function chooseOutcome(outcome: FeedbackOutcome) {
    if (!selected) trackEvent('feedback_started');
    setSelected(outcome);
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); if (!selected || submitted) return;
    setSending(true); setError('');
    try {
      await sendFeedback(reportId, selected, category || undefined, comment);
      trackEvent('feedback_completed', { outcome: selected });
      localStorage.setItem(storageKey, 'submitted'); setSubmitted(true);
      setSummary((current) => current ? { ...current, totalResponses: current.totalResponses + 1, worked: current.worked + (selected === 'WORKED' ? 1 : 0), partial: current.partial + (selected === 'PARTIAL' ? 1 : 0), failed: current.failed + (selected === 'FAILED' ? 1 : 0) } : null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not send your feedback.'); }
    finally { setSending(false); }
  }

  return <section className="community-section"><div className="community-heading"><div><p className="eyebrow">REAL-WORLD OUTCOME</p><h2>Did this asset work in your project?</h2><p>Share what happened after import. This improves future compatibility guidance.</p></div><MessageSquareText /></div>
    {summary && summary.totalResponses >= 3 ? <div className="community-stats"><div className="stats-lead"><strong>{summary.totalResponses}</strong><span>developers shared feedback for this report</span></div><div><strong>{summary.worked}</strong><span>Worked</span></div><div><strong>{summary.partial}</strong><span>Partially worked</span></div><div><strong>{summary.failed}</strong><span>Failed</span></div></div> : <p className="feedback-empty">No community feedback yet. Your outcome can be the first signal.</p>}
    {submitted ? <div className="feedback-thanks"><Check size={19} /><div><strong>Thanks — this helps improve AssetForge Verify.</strong><span>Your import outcome has been recorded.</span></div></div> : <form className="feedback-form" onSubmit={submit}><div className="outcome-buttons">{outcomes.map((outcome) => <button type="button" key={outcome.value} aria-pressed={selected === outcome.value} className={selected === outcome.value ? 'selected' : ''} onClick={() => chooseOutcome(outcome.value)}>{outcome.label}</button>)}</div>{selected && <><label className="feedback-comment" htmlFor="feedback-category"><span>Issue category <small>Optional</small></span><select id="feedback-category" value={category} onChange={(event) => setCategory(event.target.value as FeedbackCategory | '')}><option value="">Choose a category</option>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="feedback-comment" htmlFor="feedback-comment"><span>{prompts[selected]} <small>Optional</small></span><textarea id="feedback-comment" maxLength={500} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a short note about the import result." /><small>{comment.length}/500</small></label></>}{error && <p className="feedback-error" role="alert">{error}</p>}{selected && <button className="feedback-submit" type="submit" disabled={sending}>{sending ? <><LoaderCircle className="spinner" size={17} /> Sending…</> : 'Send Outcome'}</button>}</form>}
  </section>;
}
