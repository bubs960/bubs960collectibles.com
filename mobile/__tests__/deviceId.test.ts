import { getDeviceId, __resetDeviceIdCacheForTests } from '../src/analytics/deviceId';
import * as SecureStore from './__mocks__/expoSecureStore';

beforeEach(() => {
  (SecureStore as unknown as { __reset: () => void }).__reset();
  __resetDeviceIdCacheForTests();
});

describe('getDeviceId', () => {
  it('generates a uuid v4 on first call and persists it', async () => {
    const id = await getDeviceId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    const dump = (SecureStore as unknown as { __dump: () => Record<string, string> }).__dump();
    expect(dump['fp.analytics.device_id']).toBe(id);
  });

  it('returns the same id across calls within a session (in-memory cache)', async () => {
    const a = await getDeviceId();
    const b = await getDeviceId();
    expect(a).toBe(b);
  });

  it('reads from secure-store when the in-memory cache is cold', async () => {
    await SecureStore.setItemAsync('fp.analytics.device_id', 'preexisting-id');
    __resetDeviceIdCacheForTests();
    const id = await getDeviceId();
    expect(id).toBe('preexisting-id');
  });

  it('dedupes concurrent in-flight reads to a single store round-trip', async () => {
    let reads = 0;
    const original = SecureStore.getItemAsync;
    (SecureStore as unknown as { getItemAsync: typeof SecureStore.getItemAsync }).getItemAsync =
      async (key: string) => {
        reads++;
        return original(key);
      };
    try {
      const [a, b, c] = await Promise.all([getDeviceId(), getDeviceId(), getDeviceId()]);
      expect(a).toBe(b);
      expect(b).toBe(c);
      expect(reads).toBe(1);
    } finally {
      (SecureStore as unknown as { getItemAsync: typeof SecureStore.getItemAsync }).getItemAsync =
        original;
    }
  });
});
