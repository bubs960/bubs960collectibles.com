import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useAuthToken } from '@/auth/useAuthToken';
import { withAuthRetry } from '@/auth/withAuthRetry';
import { fetchVault, fetchWantlist } from '@/api/collectionApi';
import { collectionStore, type ListKind } from '@/collection/localStore';
import { reconcile } from '@/collection/reconcile';

interface SyncState {
  syncing: boolean;
  lastSyncAt: number | null;
  error: Error | null;
}

/**
 * Pull-sync driver. Fetches vault + wantlist for the signed-in user,
 * reconciles against the local store, writes merged result back.
 *
 * Auth: each fetch is wrapped in withAuthRetry so a 401 triggers a
 * one-shot Clerk token refresh (engineer Q4 — applies to GET too, not
 * just writes). Second failure surfaces to `error`.
 *
 * Today this is a no-op when signed out or when the Worker returns
 * 404 / 501 (the routes are planned, not built). Once the routes ship,
 * this hook takes over without any callsite changes.
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
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const safeSet = (updater: (s: SyncState) => SyncState) => {
    if (!mounted.current) return;
    setState(updater);
  };

  const sync = useCallback(async (): Promise<void> => {
    if (!isSignedIn) return;
    safeSet((s) => ({ ...s, syncing: true, error: null }));
    try {
      // Both GETs run through withAuthRetry so a stale-token 401 on the
      // first call force-refreshes and retries once before surfacing.
      const [serverVault, serverWantlist] = await Promise.all([
        withAuthRetry(getToken, (tok) => fetchVault(tok)),
        withAuthRetry(getToken, (tok) => fetchWantlist(tok)),
      ]);
      await applyMerged('vault', serverVault);
      await applyMerged('wantlist', serverWantlist);
      safeSet(() => ({ syncing: false, lastSyncAt: Date.now(), error: null }));
    } catch (err) {
      safeSet((s) => ({ ...s, syncing: false, error: err as Error }));
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
