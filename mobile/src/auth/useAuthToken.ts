import { useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';

/**
 * Returns a function that resolves to the current Clerk session JWT (or null
 * when signed out). The backend's wantlist/vault routes read `auth()` via
 * `@clerk/nextjs/server`, which accepts Bearer tokens when the JWT template
 * is enabled server-side. Add the "mobile" JWT template in Clerk dashboard
 * if the default session token is not accepted by the server.
 */
export function useAuthToken() {
  const { getToken, isSignedIn } = useAuth();
  return useCallback(async (): Promise<string | null> => {
    if (!isSignedIn) return null;
    try {
      return await getToken();
    } catch {
      return null;
    }
  }, [getToken, isSignedIn]);
}
