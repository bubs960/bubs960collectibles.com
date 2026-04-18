import { useCallback } from 'react';
import { fetchFigureDetail } from '@/api/figureApi';
import type { FigureDetail } from '@/shared/types';
import { useSWR } from '@/cache/useSWR';

// Spec §11: figures viewed in the last 30 days should be fully viewable
// offline from cache. Pricing shows a stale indicator when >24h old — we
// don't force revalidate below that threshold, but the UI still flags the
// age so users know.
const STALE_AFTER_MS = 24 * 60 * 60 * 1000; // 24h

export function useFigureDetail(figureId: string) {
  const fetcher = useCallback(() => fetchFigureDetail(figureId), [figureId]);

  const swr = useSWR<FigureDetail>(`figure:${figureId}`, fetcher, {
    staleAfterMs: STALE_AFTER_MS,
  });

  return {
    data: swr.data,
    loading: swr.loading,
    revalidating: swr.revalidating,
    error: swr.error,
    cacheAgeSeconds: swr.cacheAgeSeconds,
    isStale: swr.cacheAgeSeconds != null && swr.cacheAgeSeconds * 1000 > STALE_AFTER_MS,
    refetch: swr.refetch,
  };
}
