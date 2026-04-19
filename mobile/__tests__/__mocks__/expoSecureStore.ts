/**
 * Stand-in for expo-secure-store. The real module uses iOS Keychain /
 * Android Keystore; tests only care about the async get/set/delete surface
 * that tokenCache consumes.
 */

const store = new Map<string, string>();

export async function getItemAsync(key: string): Promise<string | null> {
  return store.has(key) ? (store.get(key) as string) : null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  store.set(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  store.delete(key);
}

export function __reset(): void {
  store.clear();
}

export function __dump(): Record<string, string> {
  return Object.fromEntries(store);
}
