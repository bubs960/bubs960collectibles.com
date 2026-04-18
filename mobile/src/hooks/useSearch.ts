import { useEffect, useRef, useState } from 'react';
import { searchFigures, type SearchResult } from '@/api/searchApi';

interface State {
  results: SearchResult[];
  loading: boolean;
  error: Error | null;
}

const DEBOUNCE_MS = 220;

/**
 * Debounced search hook. Cancels in-flight requests when the query changes so
 * stale results never overwrite a newer response.
 */
export function useSearch(query: string, limit = 8): State {
  const [state, setState] = useState<State>({ results: [], loading: false, error: null });
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => {
    // Short queries short-circuit to empty without hitting the network.
    if (query.trim().length < 2) {
      inFlight.current?.abort();
      setState({ results: [], loading: false, error: null });
      return;
    }

    const timer = setTimeout(() => {
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;
      setState((s) => ({ ...s, loading: true, error: null }));

      searchFigures(query, { limit, signal: controller.signal })
        .then((results) => {
          if (controller.signal.aborted) return;
          setState({ results, loading: false, error: null });
        })
        .catch((err: unknown) => {
          if ((err as { name?: string })?.name === 'AbortError') return;
          setState({ results: [], loading: false, error: err as Error });
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [query, limit]);

  return state;
}
