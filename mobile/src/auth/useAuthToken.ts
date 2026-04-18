import { useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';

/**
 * Returns a function that resolves to a Clerk JWT suitable for the Worker's
 * authenticated routes, or null when signed out.
 *
 * Why a template: auth()/getToken() by default returns a session token scoped
 * to Clerk's own cookie-based verification path. The Worker verifies the JWT
 * directly against Clerk's JWKS — that requires a named JWT template in the
 * Clerk dashboard (convention: "mobile"). Override via the env var if your
 * template is named differently.
 *
 * Server side should use authenticateRequest() with an explicit template
 * allowlist — NOT bare auth() — since that was built for cookie verification.
 */
const JWT_TEMPLATE =
  process.env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE ?? 'mobile';

export function useAuthToken() {
  const { getToken, isSignedIn } = useAuth();
  return useCallback(async (): Promise<string | null> => {
    if (!isSignedIn) return null;
    try {
      return await getToken({ template: JWT_TEMPLATE });
    } catch {
      return null;
    }
  }, [getToken, isSignedIn]);
}
