import * as SecureStore from 'expo-secure-store';
import { uuidv4 } from './uuid';

/**
 * Persisted anonymous device id. Generated once on first launch, kept
 * in expo-secure-store so it survives app updates (and on Android, an
 * uninstall/reinstall — iOS clears Keychain on uninstall, which is
 * acceptable churn for analytics).
 *
 * The id is anonymous: no PII, no Apple IDFA, no Google Ad ID. It's a
 * random uuid v4 used solely so we can tell two events came from the
 * same install without identifying the user. Pairs with the optional
 * Bearer JWT — if the user signs in, the worker attaches a userId on
 * top of the device_id; signed-out events stay device-scoped.
 *
 * Cached in module scope after the first read so the secure-store
 * round-trip only happens once per process.
 */
const KEY = 'fp.analytics.device_id';
let cached: string | null = null;
let inflight: Promise<string> | null = null;

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    const existing = await SecureStore.getItemAsync(KEY).catch(() => null);
    if (existing) {
      cached = existing;
      return existing;
    }
    const fresh = uuidv4();
    await SecureStore.setItemAsync(KEY, fresh).catch(() => {
      // SecureStore can fail on simulator without a passcode set; the
      // module-level cache still stamps every event in this session
      // with a consistent id, so analytics aren't broken — only
      // session-to-session continuity is.
    });
    cached = fresh;
    return fresh;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/** Test seam — drops the in-process cache so a fresh getDeviceId reads from store again. */
export function __resetDeviceIdCacheForTests(): void {
  cached = null;
  inflight = null;
}
