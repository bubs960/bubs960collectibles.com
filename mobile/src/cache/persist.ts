import AsyncStorage from '@react-native-async-storage/async-storage';

// Versioned key prefix so we can invalidate the whole cache with one bump when
// the response shape changes.
const VERSION = 'v1';
const PREFIX = `fp:${VERSION}:`;

// Storage-quota envelope.
//
// On native: AsyncStorage is ~6MB on Android (per-key 2MB), effectively
// unbounded on iOS. On web (react-native-web → localStorage): hard 5MB
// per-origin cap. Tauri's webview is similar.
//
// Strategy: each write is guarded; a QuotaExceededError triggers an LRU
// drop of ~half our cache keys (oldest fetchedAt first), then a single
// retry. This is the "self-heal" path so long-running PWA users don't
// hit a dead-write state silently.
const EVICTION_FRACTION = 0.5;

export interface CachedEnvelope<T> {
  data: T;
  fetchedAt: number;
}

export async function readCache<T>(key: string): Promise<CachedEnvelope<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as CachedEnvelope<T>;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, data: T): Promise<void> {
  const envelope: CachedEnvelope<T> = { data, fetchedAt: Date.now() };
  const payload = JSON.stringify(envelope);
  try {
    await AsyncStorage.setItem(PREFIX + key, payload);
  } catch (err) {
    if (!isQuotaError(err)) {
      // Non-quota write failure (e.g. private-browsing throw) is
      // non-fatal — the in-memory SWR layer still has the data;
      // it just doesn't survive a reload.
      return;
    }
    // Quota hit — evict the oldest half of our keys and retry once.
    // We deliberately don't loop further: if a single 5MB-quota
    // entry can't fit, we're not going to fix it by evicting more.
    await evictOldest(EVICTION_FRACTION);
    try {
      await AsyncStorage.setItem(PREFIX + key, payload);
    } catch {
      // Still failing — drop this write. Cache is best-effort.
    }
  }
}

function isQuotaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; message?: string; code?: number };
  return (
    e.name === 'QuotaExceededError' ||
    e.code === 22 || // legacy Safari DOMException code
    /quota/i.test(e.message ?? '')
  );
}

/**
 * Drop the oldest `fraction` of our prefix-scoped entries by fetchedAt.
 * Reads ALL our envelopes to sort — O(n) but n is bounded by however
 * many figures the user has viewed, typically <500. Acceptable for an
 * eviction that runs only on quota hit.
 */
async function evictOldest(fraction: number): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const ours = allKeys.filter((k) => k.startsWith(PREFIX));
    if (ours.length === 0) return;

    const pairs = await AsyncStorage.multiGet(ours);
    const dated: Array<[string, number]> = [];
    for (const [k, v] of pairs) {
      if (!v) continue;
      try {
        const env = JSON.parse(v) as CachedEnvelope<unknown>;
        dated.push([k, env.fetchedAt ?? 0]);
      } catch {
        // Corrupt entry — drop it.
        dated.push([k, 0]);
      }
    }
    dated.sort((a, b) => a[1] - b[1]);
    const dropCount = Math.max(1, Math.floor(dated.length * fraction));
    const toRemove = dated.slice(0, dropCount).map(([k]) => k);
    if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
  } catch {
    // ignore — eviction is best-effort
  }
}

export async function clearCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(PREFIX));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch {
    // ignore
  }
}

export function cacheAgeSeconds(envelope: CachedEnvelope<unknown> | null): number | null {
  if (!envelope) return null;
  return Math.max(0, Math.round((Date.now() - envelope.fetchedAt) / 1000));
}
