import { getSupabase } from '../lib/supabase.js';

type RateLimitOptions = { windowMs: number };
type IncrementResult = { totalHits: number; resetTime: Date };
type RateLimitRow = { total_hits: number; reset_time: string };

export class SupabaseRateLimitStore {
  readonly localKeys = false;
  private windowMs = 60_000;

  constructor(readonly prefix: string) {}

  init(options: RateLimitOptions): void {
    this.windowMs = options.windowMs;
  }

  async increment(key: string): Promise<IncrementResult> {
    const { data, error } = await getSupabase().rpc('consume_api_rate_limit', {
      p_bucket: `${this.prefix}:${key}`,
      p_window_seconds: Math.ceil(this.windowMs / 1000),
    }).single<RateLimitRow>();
    if (error || !data) throw new Error('The shared rate-limit store is unavailable.');
    return { totalHits: data.total_hits, resetTime: new Date(data.reset_time) };
  }

  async decrement(): Promise<void> {
    // No limiter currently uses skipSuccessfulRequests or skipFailedRequests.
  }

  async resetKey(key: string): Promise<void> {
    const { error } = await getSupabase().from('api_rate_limits').delete().eq('bucket', `${this.prefix}:${key}`);
    if (error) throw new Error('The shared rate-limit key could not be reset.');
  }
}
