// Web override of deviceId.ts. expo-secure-store doesn't exist in the
// browser; localStorage is the closest analog (persists across sessions
// per-origin, survives reload, cleared by the user's "clear site data").
//
// Storage scope mirrors the native module: an anonymous uuid v4 stamped
// on every analytics event so the worker can correlate "same install"
// without identifying the user.
import { uuidv4 } from './uuid';

const KEY = 'fp.analytics.device_id';
let cached: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  try {
    const existing = globalThis.localStorage?.getItem(KEY) ?? null;
    if (existing) {
      cached = existing;
      return existing;
    }
  } catch {
    // localStorage can throw in private-browsing Firefox / Safari.
    // Falling through to generation keeps the session id stable in
    // memory even if persistence is denied.
  }
  const fresh = uuidv4();
  try {
    globalThis.localStorage?.setItem(KEY, fresh);
  } catch {
    // Same private-browsing fall-through. Generation succeeded; only
    // session-to-session continuity is lost.
  }
  cached = fresh;
  return fresh;
}

export function __resetDeviceIdCacheForTests(): void {
  cached = null;
}
