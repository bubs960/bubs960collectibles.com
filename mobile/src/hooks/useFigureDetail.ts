import { useEffect, useState } from 'react';
import { fetchFigureDetail, FigureFetchError } from '@/api/figureApi';
import type { FigureDetail } from '@/shared/types';

interface State {
  data: FigureDetail | null;
  loading: boolean;
  error: Error | null;
}

// Thin fetch hook. Swap for React Query / SWR when we wire real caching
// (§11: stale-while-revalidate, 30-day offline).
export function useFigureDetail(figureId: string): State {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });

    fetchFigureDetail(figureId, { signal: controller.signal })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setState({
          data: null,
          loading: false,
          error: err instanceof FigureFetchError ? err : (err as Error),
        });
      });

    return () => controller.abort();
  }, [figureId]);

  return state;
}
