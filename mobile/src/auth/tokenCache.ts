import * as SecureStore from 'expo-secure-store';

/**
 * Shape of Clerk's tokenCache contract. Declared locally rather than imported
 * from `@clerk/clerk-expo/dist/cache` so test harnesses can mock
 * `@clerk/clerk-expo` as a top-level module without needing to stub its
 * internal subpaths. Matches the interface @clerk/clerk-expo's
 * ClerkProvider expects.
 */
export interface TokenCache {
  getToken: (key: string) => Promise<string | null>;
  saveToken: (key: string, token: string) => Promise<void>;
}

// Clerk session tokens persist in the platform's secure store so users stay
// signed in across launches.
export const tokenCache: TokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Swallow — losing the token only forces a re-sign-in.
    }
  },
};
