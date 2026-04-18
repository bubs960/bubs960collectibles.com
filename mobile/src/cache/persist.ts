import AsyncStorage from '@react-native-async-storage/async-storage';

// Versioned key prefix so we can invalidate the whole cache with one bump when
// the response shape changes.
const VERSION = 'v1';
const PREFIX = `fp:${VERSION}:`;

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
  try {
    const envelope: CachedEnvelope<T> = { data, fetchedAt: Date.now() };
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(envelope));
  } catch {
    // Cache write failure is non-fatal.
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
