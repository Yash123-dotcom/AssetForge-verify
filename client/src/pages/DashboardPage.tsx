import { Copy, ScanSearch } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAccount } from '../services/verifyApi';
import type { AccountData } from '../types/verify.types';

export function DashboardPage() {
  const [account, setAccount] = useState<AccountData | null>(null); const [error, setError] = useState('');
  useEffect(() => { void getAccount().then(setAccount).catch((caught) => setError(caught instanceof Error ? caught.message : 'Dashboard could not be loaded.')); }, []);
  if (error) return <main className="empty-report shell"><div><h1>Dashboard unavailable.</h1><p>{error}</p></div></main>;
  if (!account) return <main className="report-loading shell"><p>Loading your dashboard…</p></main>;
  return <main className="dashboard-page shell"><header><p className="eyebrow">ASSETFORGE VERIFY / ACCOUNT</p><h1>Welcome back.</h1><p>{account.profile.displayName || account.profile.email}</p></header><section className="account-stats"><div><span>Available Credits</span><strong>{account.balance.availableCredits}</strong><Link to="/pricing">Buy credits</Link></div><div><span>Deep Scans Completed</span><strong>{account.totals.deepScans}</strong><Link to="/verify">Start Deep Scan</Link></div><div><span>Reports Created</span><strong>{account.totals.reports}</strong></div></section><section className="activity-section"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Recent scans</h2></div>{account.activity.length ? <div className="activity-list">{account.activity.map((item) => <article key={item.id}><ScanSearch /><div><strong>{item.name}</strong><span>{new Date(item.createdAt).toLocaleDateString()} · {item.scanType === 'DEEP_SCAN' ? 'Deep Scan' : 'Quick Check'}</span></div><b>{item.score}/100 · {item.risk}</b><Link to={`/report/${item.id}`}>View Report</Link><button aria-label="Copy report link" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/report/${item.id}`)}><Copy /></button></article>)}</div> : <div className="dashboard-empty">No reports yet. <Link to="/verify">Run your first check.</Link></div>}</section></main>;
}
