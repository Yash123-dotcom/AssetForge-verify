import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { authConfigured, supabase } from '../services/supabase';

export function AuthPage({ mode }: { mode: 'LOGIN' | 'SIGNUP' }) {
  const navigate = useNavigate(); const location = useLocation();
  const destination = (location.state as { from?: string } | null)?.from ?? '/dashboard';
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    if (!supabase) { setError('Authentication is not configured.'); return; }
    setBusy(true);
    try {
      const result = mode === 'SIGNUP'
        ? await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName.trim() || undefined }, emailRedirectTo: `${window.location.origin}/dashboard` } })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) { setError(result.error.message); return; }
      if (mode === 'SIGNUP' && !result.data.session) setMessage('Check your email to confirm your account.');
      else navigate(destination, { replace: true });
    } catch { setError('Authentication could not be reached. Please try again.'); }
    finally { setBusy(false); }
  }

  async function sendMagicLink() {
    setError(''); setMessage('');
    if (!supabase || !email) { setError('Enter your email first.'); return; }
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/dashboard`, shouldCreateUser: mode === 'SIGNUP' } });
      if (authError) setError(authError.message); else setMessage('Magic link sent. Check your email.');
    } catch { setError('Authentication could not be reached. Please try again.'); }
    finally { setBusy(false); }
  }

  async function forgotPassword() {
    setError(''); setMessage('');
    if (!supabase || !email) { setError('Enter your email first.'); return; }
    setBusy(true);
    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/account` });
      if (authError) setError(authError.message); else setMessage('Password reset link sent.');
    } catch { setError('Authentication could not be reached. Please try again.'); }
    finally { setBusy(false); }
  }

  return <main className="auth-page shell"><section className="auth-panel"><p className="eyebrow">ACCOUNT / {mode}</p><h1>{mode === 'LOGIN' ? 'Welcome back.' : 'Create your account.'}</h1><p>{mode === 'LOGIN' ? 'Sign in to use credits, Deep Scan, and scan history.' : 'Quick Check stays free. An account is required only for paid Deep Scan.'}</p>
    {!authConfigured && <div className="form-error">Supabase Auth is not configured in the frontend environment.</div>}
    <form onSubmit={submit}>{mode === 'SIGNUP' && <label>Display name <span>Optional</span><input value={displayName} maxLength={80} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" /></label>}<label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label><label>Password<input type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'LOGIN' ? 'current-password' : 'new-password'} /></label>{error && <div className="form-error" role="alert">{error}</div>}{message && <div className="auth-message" role="status">{message}</div>}<button className="editorial-button" disabled={busy || !authConfigured}>{busy ? <LoaderCircle className="spinner" /> : mode === 'LOGIN' ? 'Sign In' : 'Create Account'}</button></form>
    <div className="auth-options"><button type="button" onClick={() => void sendMagicLink()}>Email me a magic link</button>{mode === 'LOGIN' && <button type="button" onClick={() => void forgotPassword()}>Forgot password?</button>}</div>
    <p className="auth-switch">{mode === 'LOGIN' ? <>New here? <Link to="/signup">Create an account</Link></> : <>Already have an account? <Link to="/login">Sign in</Link></>}</p>
  </section></main>;
}
