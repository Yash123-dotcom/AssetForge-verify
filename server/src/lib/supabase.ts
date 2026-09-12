import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PersistenceError } from './errors.js';

let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new PersistenceError('Report storage is not configured.');
  }
  if (!serviceRoleKey.startsWith('sb_secret_')) {
    throw new PersistenceError('Use a current Supabase secret key instead of a legacy service-role JWT.');
  }
  client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}
