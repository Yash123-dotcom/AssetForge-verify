export class TtlCache<T> {
  private readonly values = new Map<string, { value: T; expiresAt: number }>();
  constructor(private readonly ttlMs: number, private readonly maxEntries = 500) {
    if (ttlMs <= 0 || maxEntries <= 0) throw new RangeError('Cache limits must be positive.');
  }
  get(key: string): T | undefined { const item = this.values.get(key); if (!item) return; if (Date.now() >= item.expiresAt) { this.values.delete(key); return; } return item.value; }
  set(key: string, value: T): void {
    const now = Date.now();
    for (const [cachedKey, item] of this.values) {
      if (item.expiresAt <= now) this.values.delete(cachedKey);
    }
    if (!this.values.has(key) && this.values.size >= this.maxEntries) {
      const oldestKey = this.values.keys().next().value as string | undefined;
      if (oldestKey) this.values.delete(oldestKey);
    }
    this.values.delete(key);
    this.values.set(key, { value, expiresAt: now + this.ttlMs });
  }
}
