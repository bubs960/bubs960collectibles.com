import { useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';

/**
 * Returns a function that resolves to a Clerk JWT for the Worker's
 * authenticated routes, or null when signed out.
 *
 * v1 uses the DEFAULT session token (no JWT template). Per engineer
 * 2026-04-19: the default claims — sub, sid, iss, iat, exp — are enough
 * for v1. Worker's hand-rolled JWKS middleware verifies those claims.
 *
 * Pass `{ forceRefresh: true }` to bypass Clerk's in-memory cache and
 * get a fresh token. Used by API callers that hit 401 (token expired
 * mid-flight) — one retry with a fresh token before surfacing to user,
 * per engineer Q4.
 */
const JWT_TEMPLATE = process.env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE;

export interface GetTokenOptions {
  forceRefresh?: boolean;
}

export function useAuthToken() {
  const { getToken, isSignedIn } = useAuth();
  return useCallback(
    async (opts: GetTokenOptions = {}): Promise<string | null> => {
      if (!isSignedIn) return null;
      try {
        const clerkOpts: { template?: string; skipCache?: boolean } = {};
        if (JWT_TEMPLATE) clerkOpts.template = JWT_TEMPLATE;
        if (opts.forceRefresh) clerkOpts.skipCache = true;
        return await getToken(clerkOpts);
      } catch {
        return null;
      }
    },
    [getToken, isSignedIn],
  );
}
