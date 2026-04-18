import { useCallback, useEffect, useRef, useState } from 'react';
import { readCache, writeCache, cacheAgeSeconds, type CachedEnvelope } from './persist';

export interface SWRState<T> {
  data: T | null;
  error: Error | null;
  /** True during the very first fetch when no cache exists. */
  loading: boolean;
  /** True while a background revalidation is in flight. */
  revalidating: boolean;
  /** Seconds since the data was fetched from the network. Null when data is null. */
  cacheAgeSeconds: number | null;
  refetch: () => Promise<void>;
}

export interface SWROptions<T> {
  /** Milliseconds before a cached value is considered stale. */
  staleAfterMs?: number;
  /** Called on every successful fetch. Lets callers fan-out events. */
  onFetched?: (data: T) => void;
}

/**
 * Minimal stale-while-revalidate hook backed by AsyncStorage. Matches the
 * spec §11 contract: return cached data immediately, revalidate in the
 * background, soft-update on success.
 */
export function useSWR<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  opts: SWROptions<T> = {},
): SWRState<T> {
  const [envelope, setEnvelope] = useState<CachedEnvelope<T> | null>(null);
  const [loading, setLoading] = useState(!!key);
  const [revalidating, setRevalidating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetcherRef = useRef(fetcher);
  const onFetchedRef = useRef(opts.onFetched);
  fetcherRef.current = fetcher;
  onFetchedRef.current = opts.onFetched;

  const run = useCallback(
    async (force: boolean) => {
      if (!key) return;

      // Load cache first.
      const cached = await readCache<T>(key);
      if (cached) {
        setEnvelope(cached);
        setLoading(false);
      }

      const stale =
        !cached ||
        force ||
        (opts.staleAfterMs != null && Date.now() - cached.fetchedAt > opts.staleAfterMs);

      if (!stale) return;

      setRevalidating(true);
      setError(null);
      try {
        const fresh = await fetcherRef.current();
        const next: CachedEnvelope<T> = { data: fresh, fetchedAt: Date.now() };
        setEnvelope(next);
        await writeCache(key, fresh);
        onFetchedRef.current?.(fresh);
      } catch (e) {
        // Don't clobber cached data on failure.
        setError(e as Error);
      } finally {
        setRevalidating(false);
        setLoading(false);
      }
    },
    [key, opts.staleAfterMs],
  );

  useEffect(() => {
    // Reset view when key changes.
    setEnvelope(null);
    setError(null);
    setLoading(!!key);
    if (key) void run(false);
  }, [key, run]);

  const refetch = useCallback(() => run(true), [run]);

  return {
    data: envelope?.data ?? null,
    error,
    loading,
    revalidating,
    cacheAgeSeconds: cacheAgeSeconds(envelope),
    refetch,
  };
}
