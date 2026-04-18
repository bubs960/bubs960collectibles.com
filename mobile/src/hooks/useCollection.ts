import { useCallback, useRef, useState } from 'react';
import { useAuthToken } from '@/auth/useAuthToken';
import {
  addToVault,
  addToWantlist,
  deleteVaultItem,
  deleteWantlistItem,
} from '@/api/collectionApi';
import type { ApiFigureV1 } from '@/shared/types';

interface State {
  owned: boolean;
  wanted: boolean;
  /** Server-assigned item IDs, kept so toggle-off can DELETE. */
  vaultItemId: string | null;
  wantlistItemId: string | null;
  pending: 'owned' | 'wanted' | null;
  error: Error | null;
}

/**
 * Optimistic collection toggle with DELETE on toggle-off. Rolls back on
 * failure. Uses a figure-getter so the caller doesn't need to pass a stable
 * reference. The server ids returned by POST are held in state and reused
 * when the user un-toggles — the server is expected to soft-delete
 * (status='removed'), see collectionApi comments.
 */
export function useCollection(getFigure: () => ApiFigureV1 | null) {
  const getToken = useAuthToken();
  const [state, setState] = useState<State>({
    owned: false,
    wanted: false,
    vaultItemId: null,
    wantlistItemId: null,
    pending: null,
    error: null,
  });
  const getFigureRef = useRef(getFigure);
  getFigureRef.current = getFigure;

  const toggleOwned = useCallback(async (): Promise<void> => {
    const prev = state.owned;
    const prevId = state.vaultItemId;
    setState((s) => ({ ...s, owned: !prev, pending: 'owned', error: null }));

    const figure = getFigureRef.current();
    if (!figure) {
      setState((s) => ({ ...s, owned: prev, pending: null }));
      return;
    }
    try {
      const token = await getToken();
      if (!token) throw new Error('not signed in');
      if (!prev) {
        const { id } = await addToVault(figure, token);
        setState((s) => ({ ...s, vaultItemId: id, pending: null }));
      } else if (prevId) {
        await deleteVaultItem(prevId, token);
        setState((s) => ({ ...s, vaultItemId: null, pending: null }));
      } else {
        // No server id — nothing to delete; just clear local state.
        setState((s) => ({ ...s, pending: null }));
      }
    } catch (err) {
      setState((s) => ({
        ...s,
        owned: prev,
        vaultItemId: prevId,
        pending: null,
        error: err as Error,
      }));
    }
  }, [getToken, state.owned, state.vaultItemId]);

  const toggleWanted = useCallback(async (): Promise<void> => {
    const prev = state.wanted;
    const prevId = state.wantlistItemId;
    setState((s) => ({ ...s, wanted: !prev, pending: 'wanted', error: null }));

    const figure = getFigureRef.current();
    if (!figure) {
      setState((s) => ({ ...s, wanted: prev, pending: null }));
      return;
    }
    try {
      const token = await getToken();
      if (!token) throw new Error('not signed in');
      if (!prev) {
        const { id } = await addToWantlist(figure, token);
        setState((s) => ({ ...s, wantlistItemId: id, pending: null }));
      } else if (prevId) {
        await deleteWantlistItem(prevId, token);
        setState((s) => ({ ...s, wantlistItemId: null, pending: null }));
      } else {
        setState((s) => ({ ...s, pending: null }));
      }
    } catch (err) {
      setState((s) => ({
        ...s,
        wanted: prev,
        wantlistItemId: prevId,
        pending: null,
        error: err as Error,
      }));
    }
  }, [getToken, state.wanted, state.wantlistItemId]);

  return {
    owned: state.owned,
    wanted: state.wanted,
    pending: state.pending,
    error: state.error,
    toggleOwned,
    toggleWanted,
  };
}
