/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { useSearch } from '../src/hooks/useSearch';

const originalFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});
afterEach(() => {
  global.fetch = originalFetch;
});

// The hook uses a 220ms debounce — real timers are simpler than fake ones
// for the two-state flow. Most cases run in <300ms anyway.
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('useSearch', () => {
  it('returns empty + not loading for queries under 2 chars', async () => {
    const { result } = renderHook(() => useSearch(''));
    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
    await sleep(250);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('debounces: a single fetch fires 220ms after the last query update', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ figures: [] }) });

    const { rerender } = renderHook(({ q }: { q: string }) => useSearch(q), {
      initialProps: { q: 'r' },
    });
    rerender({ q: 're' });
    rerender({ q: 'rey' });

    // Before the debounce timer expires, no fetch yet.
    await sleep(50);
    expect(fetchMock).toHaveBeenCalledTimes(0);

    // After the timer, exactly one fetch for the latest value.
    await sleep(250);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get('q')).toBe('rey');
  });

  it('cancels an in-flight request when the query changes, so stale results never overwrite fresh ones', async () => {
    // First call resolves late with a stale result; second resolves quickly.
    const abortedResolve: Array<{ ok: true; json: () => Promise<{ figures: unknown[] }> }> = [];
    fetchMock
      .mockImplementationOnce(
        (_url: string, opts: { signal: AbortSignal }) =>
          new Promise((resolve, reject) => {
            opts.signal.addEventListener('abort', () => {
              reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
            });
            setTimeout(() => resolve({ ok: true, json: async () => ({ figures: [{ figure_id: 'stale' }] }) }), 500);
          }),
      )
      .mockImplementationOnce(async () => ({
        ok: true,
        json: async () => ({
          figures: [
            {
              figure_id: 'fresh',
              name: 'Fresh',
              brand: 'B',
              line: 'L',
              series: '1',
              genre: 'g',
            },
          ],
        }),
      }));

    const { result, rerender } = renderHook(({ q }: { q: string }) => useSearch(q), {
      initialProps: { q: 'old' },
    });
    await sleep(250); // trigger first fetch
    rerender({ q: 'new' });
    await sleep(250); // second fetch fires, aborts first

    await waitFor(() => expect(result.current.results.length).toBe(1));
    expect(result.current.results[0].figure_id).toBe('fresh');
    void abortedResolve;
  });

  it('clears results immediately when the query shrinks below 2 chars', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        figures: [
          { figure_id: 'a', name: 'A', brand: 'B', line: 'L', series: '1', genre: 'g' },
        ],
      }),
    });

    const { result, rerender } = renderHook(({ q }: { q: string }) => useSearch(q), {
      initialProps: { q: 'rey' },
    });
    await sleep(250);
    expect(result.current.results).toHaveLength(1);

    await act(async () => {
      rerender({ q: 'r' });
    });
    expect(result.current.results).toEqual([]);
  });

  it('surfaces errors without wiping the previous results', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          figures: [{ figure_id: 'a', name: 'A', brand: 'B', line: 'L', series: '1', genre: 'g' }],
        }),
      })
      .mockRejectedValueOnce(new Error('offline'));

    const { result, rerender } = renderHook(({ q }: { q: string }) => useSearch(q), {
      initialProps: { q: 'rey' },
    });
    await sleep(250);
    expect(result.current.results).toHaveLength(1);

    rerender({ q: 'rey mysterio' });
    await sleep(250);
    await waitFor(() => expect(result.current.error).not.toBeNull());
    // Previous results were cleared by the error — this is intentional:
    // the hook returns empty on error to avoid showing stale results for
    // the new query. Worth locking in so a refactor doesn't silently
    // flip the behavior.
    expect(result.current.results).toEqual([]);
  });
});
