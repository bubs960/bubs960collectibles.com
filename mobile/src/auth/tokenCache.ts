import * as SecureStore from 'expo-secure-store';
import type { TokenCache } from '@clerk/clerk-expo/dist/cache';

// Clerk session tokens persist in the platform's secure store so users stay
// signed in across launches. Matches the pattern from @clerk/clerk-expo docs.
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
