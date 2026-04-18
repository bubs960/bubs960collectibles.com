import { useCallback, useRef, useState } from 'react';
import { useAuthToken } from '@/auth/useAuthToken';
import { addToVault, addToWantlist } from '@/api/collectionApi';
import type { ApiFigureV1 } from '@/shared/types';

interface State {
  owned: boolean;
  wanted: boolean;
  pending: 'owned' | 'wanted' | null;
  error: Error | null;
}

/**
 * Optimistic collection toggle. Rolls back on failure. Takes a getter so the
 * caller doesn't need to pass a stable figure reference — the current figure
 * is read at mutation time from whatever state the parent has.
 *
 * DELETE support (unsetting owned/wanted) lands when the backend exposes
 * wantlist/[id] + vault/[id] DELETE routes. Today we only POST on transition
 * to true; transitioning back to false is local-only.
 */
export function useCollection(getFigure: () => ApiFigureV1 | null) {
  const getToken = useAuthToken();
  const [state, setState] = useState<State>({
    owned: false,
    wanted: false,
    pending: null,
    error: null,
  });
  const getFigureRef = useRef(getFigure);
  getFigureRef.current = getFigure;

  const toggleOwned = useCallback(async (): Promise<void> => {
    setState((s) => {
      if (s.pending) return s;
      return { ...s, owned: !s.owned, pending: 'owned', error: null };
    });
    const figure = getFigureRef.current();
    if (!figure) {
      setState((s) => ({ ...s, owned: !s.owned, pending: null }));
      return;
    }
    try {
      const token = await getToken();
      if (!token) throw new Error('not signed in');
      // Only POST on transition to true; false→unset is local-only until
      // backend ships DELETE.
      await addToVault(figure, token);
    } catch (err) {
      setState((s) => ({ ...s, owned: !s.owned, pending: null, error: err as Error }));
      return;
    }
    setState((s) => ({ ...s, pending: null }));
  }, [getToken]);

  const toggleWanted = useCallback(async (): Promise<void> => {
    setState((s) => {
      if (s.pending) return s;
      return { ...s, wanted: !s.wanted, pending: 'wanted', error: null };
    });
    const figure = getFigureRef.current();
    if (!figure) {
      setState((s) => ({ ...s, wanted: !s.wanted, pending: null }));
      return;
    }
    try {
      const token = await getToken();
      if (!token) throw new Error('not signed in');
      await addToWantlist(figure, token);
    } catch (err) {
      setState((s) => ({ ...s, wanted: !s.wanted, pending: null, error: err as Error }));
      return;
    }
    setState((s) => ({ ...s, pending: null }));
  }, [getToken]);

  return {
    owned: state.owned,
    wanted: state.wanted,
    pending: state.pending,
    error: state.error,
    toggleOwned,
    toggleWanted,
  };
}
