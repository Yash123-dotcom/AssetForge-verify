import { describe, expect, it } from 'vitest';
import { TtlCache } from './ttl-cache.js';

describe('TtlCache', () => {
  it('evicts the oldest entry when its size limit is reached', () => {
    const cache = new TtlCache<number>(60_000, 2);
    cache.set('first', 1);
    cache.set('second', 2);
    cache.set('third', 3);
    expect(cache.get('first')).toBeUndefined();
    expect(cache.get('second')).toBe(2);
    expect(cache.get('third')).toBe(3);
  });

  it('rejects invalid limits', () => {
    expect(() => new TtlCache(0)).toThrow(RangeError);
    expect(() => new TtlCache(1000, 0)).toThrow(RangeError);
  });
});
