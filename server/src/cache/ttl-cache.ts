export class TtlCache<T> {
  private readonly values = new Map<string, { value: T; expiresAt: number }>();
  constructor(private readonly ttlMs: number) {}
  get(key: string): T | undefined { const item = this.values.get(key); if (!item) return; if (Date.now() >= item.expiresAt) { this.values.delete(key); return; } return item.value; }
  set(key: string, value: T): void { this.values.set(key, { value, expiresAt: Date.now() + this.ttlMs }); }
}
