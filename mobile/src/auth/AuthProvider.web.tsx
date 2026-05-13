import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
import { FEATURES } from '@/config/features';

/**
 * Web variant of AuthProvider. @clerk/clerk-react uses browser cookies
 * + localStorage internally, so no tokenCache prop is required (and
 * none is exposed by the API).
 *
 * Clerk's web SDK requires the allowed origin to be configured in the
 * Clerk dashboard. For local dev, add `http://localhost:8081` /
 * `http://localhost:19006`. For production, add the deployed origin
 * (e.g. `https://app.figurepinner.com`).
 *
 * The same EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY env var is honored, so a
 * single key serves all three targets (iOS, Android, Web).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!FEATURES.collectionSync) {
    return <>{children}</>;
  }
  const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
  return <ClerkProvider publishableKey={key}>{children}</ClerkProvider>;
}
