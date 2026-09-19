import type { Session } from '@supabase/supabase-js';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { authConfigured, supabase } from '../services/supabase';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(false); });
    return () => data.subscription.unsubscribe();
  }, []);
  const value = useMemo(() => ({ user: session?.user ?? null, session, loading, configured: authConfigured, signOut: async () => { await supabase?.auth.signOut(); } }), [session, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
