import { useCollectionSync } from '@/hooks/useCollectionSync';

/**
 * Headless driver — calls useCollectionSync() once so the sync runs on
 * sign-in / user change. Rendered by App.tsx ONLY when
 * FEATURES.collectionSync is true, because the hook uses @clerk/clerk-expo's
 * useAuth which requires a ClerkProvider higher in the tree.
 */
export function CollectionSyncDriver(): null {
  useCollectionSync();
  return null;
}
