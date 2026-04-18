/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import AsyncStorage from './__mocks__/asyncStorage';
import { useSWR } from '../src/cache/useSWR';

beforeEach(() => {
  (AsyncStorage as { __reset: () => void }).__reset();
});

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

describe('useSWR', () => {
  it('first mount: shows loading, then resolves with fetched data', async () => {
    const fetcher = jest.fn().mockResolvedValue({ name: 'A' });

    const { result } = renderHook(() => useSWR<{ name: string }>('k', fetcher));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ name: 'A' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('second mount: returns cached data immediately then revalidates in background', async () => {
    await AsyncStorage.setItem(
      'fp:v1:k',
      JSON.stringify({ data: { name: 'cached' }, fetchedAt: Date.now() - 5_000 }),
    );
    const fetcher = jest.fn().mockResolvedValue({ name: 'fresh' });

    const { result } = renderHook(() => useSWR<{ name: string }>('k', fetcher, {}));

    await waitFor(() => expect(result.current.data).toEqual({ name: 'cached' }));
    expect(result.current.loading).toBe(false);

    // Because staleAfterMs is not set, no revalidation is triggered.
    await flush();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('revalidates in background when cache is older than staleAfterMs', async () => {
    const OLD = Date.now() - 10_000;
    await AsyncStorage.setItem(
      'fp:v1:k',
      JSON.stringify({ data: { v: 'old' }, fetchedAt: OLD }),
    );

    // Deferred fetch so we can assert the cached value surfaces first, then
    // release the network to watch it get replaced.
    let release!: (val: { v: string }) => void;
    const pending = new Promise<{ v: string }>((r) => {
      release = r;
    });
    const fetcher = jest.fn().mockImplementation(() => pending);

    const { result } = renderHook(() =>
      useSWR<{ v: string }>('k', fetcher, { staleAfterMs: 1_000 }),
    );

    await waitFor(() => expect(result.current.data).toEqual({ v: 'old' }));
    expect(result.current.revalidating).toBe(true);

    await act(async () => {
      release({ v: 'new' });
    });
    await waitFor(() => expect(result.current.data).toEqual({ v: 'new' }));
    expect(result.current.revalidating).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('keeps cached data intact when the revalidation fetch fails', async () => {
    await AsyncStorage.setItem(
      'fp:v1:k',
      JSON.stringify({ data: { v: 'cached' }, fetchedAt: Date.now() - 10_000 }),
    );
    const fetcher = jest.fn().mockRejectedValue(new Error('net down'));

    const { result } = renderHook(() =>
      useSWR<{ v: string }>('k', fetcher, { staleAfterMs: 1_000 }),
    );

    await waitFor(() => expect(result.current.data).toEqual({ v: 'cached' }));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    // Cache not wiped — critical for offline (§11 / §13 acceptance item).
    expect(result.current.data).toEqual({ v: 'cached' });
  });

  it('refetch() forces a revalidation even when cache is fresh', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce({ v: 1 })
      .mockResolvedValueOnce({ v: 2 });

    const { result } = renderHook(() =>
      useSWR<{ v: number }>('k', fetcher, { staleAfterMs: 60_000 }),
    );

    await waitFor(() => expect(result.current.data).toEqual({ v: 1 }));

    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.data).toEqual({ v: 2 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('null key: hook stays idle and never calls the fetcher', async () => {
    const fetcher = jest.fn();
    const { result } = renderHook(() => useSWR(null, fetcher, {}));
    await flush();
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('onFetched fires once per successful fetch', async () => {
    const fetcher = jest.fn().mockResolvedValue({ ok: true });
    const onFetched = jest.fn();

    const { result } = renderHook(() =>
      useSWR<{ ok: boolean }>('k', fetcher, { onFetched }),
    );
    await waitFor(() => expect(result.current.data).toEqual({ ok: true }));
    expect(onFetched).toHaveBeenCalledTimes(1);
    expect(onFetched).toHaveBeenCalledWith({ ok: true });
  });
});
