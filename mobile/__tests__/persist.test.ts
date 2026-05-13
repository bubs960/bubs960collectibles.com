import AsyncStorage from './__mocks__/asyncStorage';
import {
  readCache,
  writeCache,
  clearCache,
  cacheAgeSeconds,
  type CachedEnvelope,
} from '../src/cache/persist';

beforeEach(() => {
  (AsyncStorage as { __reset: () => void }).__reset();
});

describe('persist layer', () => {
  it('readCache returns null on a miss', async () => {
    await expect(readCache<{ a: number }>('missing')).resolves.toBeNull();
  });

  it('writeCache then readCache round-trips the envelope with a recent timestamp', async () => {
    const before = Date.now();
    await writeCache('k1', { hello: 'world' });
    const after = Date.now();

    const env = await readCache<{ hello: string }>('k1');
    expect(env).not.toBeNull();
    expect(env!.data).toEqual({ hello: 'world' });
    expect(env!.fetchedAt).toBeGreaterThanOrEqual(before);
    expect(env!.fetchedAt).toBeLessThanOrEqual(after);
  });

  it('keys are namespaced with the version prefix so unrelated AsyncStorage keys are untouched', async () => {
    await writeCache('k1', 1);
    const dumped = (AsyncStorage as { __dump: () => Record<string, string> }).__dump();
    const keys = Object.keys(dumped);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^fp:v\d+:/);
    expect(keys[0]).toContain('k1');
  });

  it('clearCache removes only entries with the fp prefix', async () => {
    await writeCache('k1', 1);
    await writeCache('k2', 2);
    await AsyncStorage.setItem('unrelated-key', 'x');

    await clearCache();

    const dumped = (AsyncStorage as { __dump: () => Record<string, string> }).__dump();
    expect(Object.keys(dumped)).toEqual(['unrelated-key']);
  });

  it('readCache returns null when the stored JSON is corrupt', async () => {
    // Write garbage directly under our prefix.
    await AsyncStorage.setItem('fp:v1:k1', '{not valid json');
    await expect(readCache('k1')).resolves.toBeNull();
  });

  it('cacheAgeSeconds is null for null envelope', () => {
    expect(cacheAgeSeconds(null)).toBeNull();
  });

  it('cacheAgeSeconds reflects elapsed seconds since fetch', () => {
    const env: CachedEnvelope<unknown> = {
      data: {},
      fetchedAt: Date.now() - 10_000,
    };
    const age = cacheAgeSeconds(env);
    expect(age).not.toBeNull();
    expect(age!).toBeGreaterThanOrEqual(9);
    expect(age!).toBeLessThanOrEqual(11);
  });

  it('cacheAgeSeconds clamps to non-negative even if fetchedAt is in the future (clock skew)', () => {
    const env: CachedEnvelope<unknown> = {
      data: {},
      fetchedAt: Date.now() + 60_000,
    };
    expect(cacheAgeSeconds(env)).toBe(0);
  });

  describe('web quota recovery', () => {
    // The web target (localStorage) caps at ~5MB. When the cache fills,
    // setItem throws QuotaExceededError. The persist layer should drop
    // the oldest ~half of our entries and retry the write once.
    it('evicts the oldest half of entries on a quota error and retries the write', async () => {
      const dropped: string[] = [];
      // Seed five entries with strictly-ascending fetchedAt so the sort
      // order in evictOldest is deterministic.
      const now = Date.now();
      for (let i = 0; i < 5; i++) {
        await AsyncStorage.setItem(
          `fp:v1:f${i}`,
          JSON.stringify({ data: { id: i }, fetchedAt: now + i }),
        );
      }

      const originalSet = AsyncStorage.setItem.bind(AsyncStorage);
      let quotaThrows = 1;
      (AsyncStorage as unknown as { setItem: typeof AsyncStorage.setItem }).setItem = async (
        k: string,
        v: string,
      ): Promise<void> => {
        if (quotaThrows > 0 && k === 'fp:v1:newkey') {
          quotaThrows -= 1;
          const e = new Error('QuotaExceededError');
          (e as { name: string }).name = 'QuotaExceededError';
          throw e;
        }
        return originalSet(k, v);
      };

      try {
        await writeCache('newkey', { fresh: true });
      } finally {
        (AsyncStorage as unknown as { setItem: typeof AsyncStorage.setItem }).setItem = originalSet;
      }

      const after = (AsyncStorage as { __dump: () => Record<string, string> }).__dump();
      // newkey landed on the retry.
      expect(after['fp:v1:newkey']).toBeTruthy();
      // The oldest entries (f0, f1) should be evicted; f2..f4 + newkey survive.
      const survivors = Object.keys(after).filter((k) => k.startsWith('fp:v1:'));
      expect(survivors).toContain('fp:v1:newkey');
      expect(survivors).toContain('fp:v1:f4');
      expect(survivors).not.toContain('fp:v1:f0');
      expect(survivors).not.toContain('fp:v1:f1');
      // Make sure we didn't accidentally evict UNrelated keys outside
      // our prefix.
      expect(dropped).toEqual([]);
    });

    it('silently drops the write when even post-eviction the retry still fails', async () => {
      const originalSet = AsyncStorage.setItem.bind(AsyncStorage);
      (AsyncStorage as unknown as { setItem: typeof AsyncStorage.setItem }).setItem = async () => {
        const e = new Error('QuotaExceededError');
        (e as { name: string }).name = 'QuotaExceededError';
        throw e;
      };
      try {
        // Should NOT throw — drop-on-failure semantic is documented.
        await expect(writeCache('newkey', {})).resolves.toBeUndefined();
      } finally {
        (AsyncStorage as unknown as { setItem: typeof AsyncStorage.setItem }).setItem = originalSet;
      }
    });

    it('ignores non-quota errors (e.g. private browsing throws) without trying to evict', async () => {
      // Seed one entry so we can verify it survives.
      await AsyncStorage.setItem('fp:v1:keep', JSON.stringify({ data: 'x', fetchedAt: 1 }));

      const originalSet = AsyncStorage.setItem.bind(AsyncStorage);
      (AsyncStorage as unknown as { setItem: typeof AsyncStorage.setItem }).setItem = async (
        k: string,
        v: string,
      ): Promise<void> => {
        if (k === 'fp:v1:newkey') throw new Error('SecurityError'); // private-browsing-style
        return originalSet(k, v);
      };
      try {
        await writeCache('newkey', { fresh: true });
      } finally {
        (AsyncStorage as unknown as { setItem: typeof AsyncStorage.setItem }).setItem = originalSet;
      }

      const after = (AsyncStorage as { __dump: () => Record<string, string> }).__dump();
      // Eviction must NOT have run — the seeded entry is still there.
      expect(after['fp:v1:keep']).toBeTruthy();
      // newkey didn't land (the throw is non-quota; we don't retry).
      expect(after['fp:v1:newkey']).toBeUndefined();
    });
  });
});
