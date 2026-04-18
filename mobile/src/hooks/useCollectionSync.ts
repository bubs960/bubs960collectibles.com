import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useAuthToken } from '@/auth/useAuthToken';
import { fetchVault, fetchWantlist } from '@/api/collectionApi';
import { collectionStore, type ListKind } from '@/collection/localStore';
import { reconcile } from '@/collection/reconcile';

interface SyncState {
  syncing: boolean;
  lastSyncAt: number | null;
  error: Error | null;
}

/**
 * Pull-sync driver. Fetches the server's vault + wantlist for the signed-in
 * user, reconciles against the local store, and writes the merged result
 * back. Intended to run once on sign-in and on explicit refresh.
 *
 * Today this is a no-op when signed out or when the backend returns 404 /
 * 501 (the Worker routes are planned, not built — see
 * docs/SERVER-ENDPOINTS-NEEDED.md). Once the routes ship, this hook takes
 * over without any callsite changes.
 */
export function useCollectionSync() {
  const { isSignedIn, userId } = useAuth();
  const getToken = useAuthToken();
  const [state, setState] = useState<SyncState>({
    syncing: false,
    lastSyncAt: null,
    error: null,
  });
  const lastUserRef = useRef<string | null>(null);

  const sync = useCallback(async (): Promise<void> => {
    if (!isSignedIn) return;
    setState((s) => ({ ...s, syncing: true, error: null }));
    try {
      const token = await getToken();
      if (!token) {
        setState((s) => ({ ...s, syncing: false }));
        return;
      }
      const [serverVault, serverWantlist] = await Promise.all([
        fetchVault(token),
        fetchWantlist(token),
      ]);
      await applyMerged('vault', serverVault);
      await applyMerged('wantlist', serverWantlist);
      setState({ syncing: false, lastSyncAt: Date.now(), error: null });
    } catch (err) {
      setState((s) => ({ ...s, syncing: false, error: err as Error }));
    }
  }, [isSignedIn, getToken]);

  // Auto-sync when the signed-in user changes (including first sign-in).
  useEffect(() => {
    if (!isSignedIn) {
      lastUserRef.current = null;
      return;
    }
    if (userId && userId !== lastUserRef.current) {
      lastUserRef.current = userId;
      void sync();
    }
  }, [isSignedIn, userId, sync]);

  return { ...state, sync };
}

async function applyMerged(
  kind: ListKind,
  server: Awaited<ReturnType<typeof fetchVault>>,
): Promise<void> {
  await collectionStore.load();
  const local = collectionStore.get(kind);
  const merged = reconcile(local, server);
  await collectionStore.replaceList(kind, merged);
}
