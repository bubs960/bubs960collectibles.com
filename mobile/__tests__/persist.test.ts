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
});
