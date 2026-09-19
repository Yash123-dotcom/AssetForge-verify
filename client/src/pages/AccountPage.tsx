import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth-context';
import { supabase } from '../services/supabase';
import { getAccount } from '../services/verifyApi';
import type { AccountData } from '../types/verify.types';

export function AccountPage() {
  const [account, setAccount] = useState<AccountData | null>(null); const [password, setPassword] = useState(''); const [message, setMessage] = useState('');
  const { signOut } = useAuth(); const navigate = useNavigate();
  useEffect(() => { void getAccount().then(setAccount); }, []);
  async function updatePassword(event: FormEvent) { event.preventDefault(); const { error } = await supabase!.auth.updateUser({ password }); setMessage(error?.message ?? 'Password updated.'); setPassword(''); }
  if (!account) return <main className="report-loading shell"><p>Loading account…</p></main>;
  return <main className="account-page shell"><header><p className="eyebrow">ACCOUNT</p><h1>Your AssetForge account.</h1></header><section className="account-profile"><div><span>Email</span><strong>{account.profile.email}</strong></div><div><span>Account created</span><strong>{new Date(account.profile.createdAt).toLocaleDateString()}</strong></div><div><span>Credit balance</span><strong>{account.balance.availableCredits}</strong></div></section><section className="history-section"><h2>Payment history</h2>{account.payments.length ? account.payments.map((item) => <p key={item.id}><span>{new Date(item.created_at).toLocaleDateString()}</span><strong>{item.credits_purchased} credits · {item.currency} {(item.amount / 100).toFixed(2)}</strong><em>{item.status}</em></p>) : <p className="dashboard-empty">No purchases yet.</p>}</section><details className="history-section"><summary>Credit history</summary>{account.creditTransactions.map((item) => <p key={item.id}><span>{new Date(item.created_at).toLocaleDateString()}</span><strong>{item.amount > 0 ? '+' : ''}{item.amount} · {item.type.replaceAll('_', ' ')}</strong></p>)}</details><section className="password-section"><h2>Set a new password</h2><form onSubmit={updatePassword}><input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" /><button>Update password</button></form>{message && <p>{message}</p>}</section><button className="account-signout" onClick={() => void signOut().then(() => navigate('/'))}>Sign Out</button></main>;
}
