/**
 * In-memory stand-in for @react-native-async-storage/async-storage — the real
 * module is a native bridge, but the persist layer only uses getItem/setItem/
 * getAllKeys/multiRemove which are trivial to model with a Map.
 */

const store = new Map<string, string>();

const AsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    return store.has(key) ? (store.get(key) as string) : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    store.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    store.delete(key);
  },
  async getAllKeys(): Promise<string[]> {
    return Array.from(store.keys());
  },
  async multiRemove(keys: readonly string[]): Promise<void> {
    for (const k of keys) store.delete(k);
  },
  __reset(): void {
    store.clear();
  },
  __dump(): Record<string, string> {
    return Object.fromEntries(store);
  },
};

export default AsyncStorage;
