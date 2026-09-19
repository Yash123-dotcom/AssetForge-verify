import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';
import { authConfigured } from '../services/supabase';

export type AuthContextValue = { user: User | null; session: Session | null; loading: boolean; configured: boolean; signOut: () => Promise<void> };
export const AuthContext = createContext<AuthContextValue>({ user: null, session: null, loading: true, configured: authConfigured, signOut: async () => undefined });
export function useAuth() { return useContext(AuthContext); }
