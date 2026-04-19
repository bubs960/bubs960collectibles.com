import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthToken } from '@/auth/useAuthToken';
import {
  addToVault,
  addToWantlist,
  deleteVaultItem,
  deleteWantlistItem,
} from '@/api/collectionApi';
import { collectionStore } from '@/collection/localStore';
import { useCollectionList } from '@/hooks/useCollectionList';
import type { ApiFigureV1 } from '@/shared/types';

interface UseCollectionResult {
  owned: boolean;
  wanted: boolean;
  pending: 'owned' | 'wanted' | null;
  error: Error | null;
  toggleOwned: () => Promise<void>;
  toggleWanted: () => Promise<void>;
}

/**
 * Local-first collection toggle.
 *
 * UI state is driven by the local AsyncStorage-backed store — toggles take
 * effect immediately with no network round trip. When we have an auth token
 * we also fire a best-effort Worker sync (POST / DELETE); failures are
 * captured in `error` but don't roll back the local state, matching the
 * reference mobile client's localStorage contract. Once the Worker exposes
 * GET for the lists, a pull-sync layer on top will reconcile on auth.
 */
export function useCollection(getFigure: () => ApiFigureV1 | null): UseCollectionResult {
  const getToken = useAuthToken();
  const vault = useCollectionList('vault');
  const wantlist = useCollectionList('wantlist');

  const getFigureRef = useRef(getFigure);
  getFigureRef.current = getFigure;

  // Mount guard — toggleOwned / toggleWanted can run past unmount if the
  // user navigates during a server round-trip. Gate all setState behind
  // `mounted` so we don't warn (React 18) or leak (older versions).
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const [pending, setPending] = useState<'owned' | 'wanted' | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const safeSetPending = (v: 'owned' | 'wanted' | null) => {
    if (mounted.current) setPending(v);
  };
  const safeSetError = (v: Error | null) => {
    if (mounted.current) setError(v);
  };

  const figure = getFigureRef.current();
  const figureId = figure?.figure_id ?? null;
  const owned = figureId ? vault.some((i) => i.figure_id === figureId) : false;
  const wanted = figureId ? wantlist.some((i) => i.figure_id === figureId) : false;

  const toggleOwned = useCallback(async (): Promise<void> => {
    const fig = getFigureRef.current();
    if (!fig) return;
    const wasOwned = collectionStore.has('vault', fig.figure_id);
    safeSetPending('owned');
    safeSetError(null);
    try {
      if (wasOwned) {
        const existing = collectionStore.itemFor('vault', fig.figure_id);
        await collectionStore.remove('vault', fig.figure_id);
        await syncDelete('vault', existing?.server_id ?? null, await getToken());
      } else {
        await collectionStore.addOwned(fig);
        const token = await getToken();
        if (token) {
          try {
            const { id } = await addToVault(fig, token);
            await collectionStore.attachServerId('vault', fig.figure_id, id);
          } catch (e) {
            safeSetError(e as Error);
          }
        }
      }
    } finally {
      safeSetPending(null);
    }
  }, [getToken]);

  const toggleWanted = useCallback(async (): Promise<void> => {
    const fig = getFigureRef.current();
    if (!fig) return;
    const wasWanted = collectionStore.has('wantlist', fig.figure_id);
    safeSetPending('wanted');
    safeSetError(null);
    try {
      if (wasWanted) {
        const existing = collectionStore.itemFor('wantlist', fig.figure_id);
        await collectionStore.remove('wantlist', fig.figure_id);
        await syncDelete('wantlist', existing?.server_id ?? null, await getToken());
      } else {
        await collectionStore.addWanted(fig);
        const token = await getToken();
        if (token) {
          try {
            const { id } = await addToWantlist(fig, token);
            await collectionStore.attachServerId('wantlist', fig.figure_id, id);
          } catch (e) {
            safeSetError(e as Error);
          }
        }
      }
    } finally {
      safeSetPending(null);
    }
  }, [getToken]);

  return { owned, wanted, pending, error, toggleOwned, toggleWanted };
}

async function syncDelete(
  kind: 'vault' | 'wantlist',
  serverId: string | null,
  token: string | null,
): Promise<void> {
  if (!token || !serverId) return; // No server record yet — local-only removal.
  try {
    if (kind === 'vault') await deleteVaultItem(serverId, token);
    else await deleteWantlistItem(serverId, token);
  } catch {
    // Best-effort; server soft-delete will reconcile on next pull-sync.
  }
}
