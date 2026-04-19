import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthToken } from '@/auth/useAuthToken';
import { withAuthRetry } from '@/auth/withAuthRetry';
import {
  addToVault,
  addToWantlist,
  deleteVaultItem,
  deleteWantlistItem,
  CollectionApiError,
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
 * effect immediately with no network round trip. Authed writes run through
 * `withAuthRetry` so a 401 on the first attempt triggers a one-shot Clerk
 * token refresh (per engineer Q4 2026-04-19). Second failure surfaces to
 * `error` but does NOT roll back the local state — matches the reference
 * client's localStorage contract.
 */
export function useCollection(getFigure: () => ApiFigureV1 | null): UseCollectionResult {
  const getToken = useAuthToken();
  const vault = useCollectionList('vault');
  const wantlist = useCollectionList('wantlist');

  const getFigureRef = useRef(getFigure);
  getFigureRef.current = getFigure;

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
        await syncDelete('vault', existing?.server_id ?? null, getToken);
      } else {
        await collectionStore.addOwned(fig);
        try {
          const { id } = await withAuthRetry(getToken, (tok) => addToVault(fig, tok));
          await collectionStore.attachServerId('vault', fig.figure_id, id);
        } catch (e) {
          if ((e as Error).message !== 'not signed in') safeSetError(e as Error);
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
        await syncDelete('wantlist', existing?.server_id ?? null, getToken);
      } else {
        await collectionStore.addWanted(fig);
        try {
          const { id } = await withAuthRetry(getToken, (tok) => addToWantlist(fig, tok));
          await collectionStore.attachServerId('wantlist', fig.figure_id, id);
        } catch (e) {
          if ((e as Error).message !== 'not signed in') safeSetError(e as Error);
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
  getToken: ReturnType<typeof useAuthToken>,
): Promise<void> {
  if (!serverId) return;
  try {
    await withAuthRetry(getToken, async (tok) => {
      if (kind === 'vault') await deleteVaultItem(serverId, tok);
      else await deleteWantlistItem(serverId, tok);
    });
  } catch (e) {
    // Best-effort; pull-sync reconciles later.
    if (e instanceof CollectionApiError) return;
    if ((e as Error).message === 'not signed in') return;
    // Unknown error — still swallow for best-effort semantics; the
    // reconcile pass is the source of truth.
  }
}
