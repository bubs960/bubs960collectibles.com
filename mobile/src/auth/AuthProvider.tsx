import React from 'react';
import { ClerkProvider } from '@clerk/clerk-expo';
import { FEATURES } from '@/config/features';
import { tokenCache } from './tokenCache';

/**
 * Wraps the tree in ClerkProvider only when collectionSync is on. Children
 * that need auth (SignInScreen, Settings → Account, useCollectionSync)
 * must ONLY mount under this provider. The navigator handles that by
 * gating those routes behind the same flag.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!FEATURES.collectionSync) {
    return <>{children}</>;
  }
  const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
  return (
    <ClerkProvider publishableKey={key} tokenCache={tokenCache}>
      {children}
    </ClerkProvider>
  );
}
