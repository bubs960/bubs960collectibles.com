/**
 * @jest-environment jsdom
 *
 * Integration-ish: the hook is a thin useSWR adapter around fetchFigureDetail.
 * Both are already tested, but the adapter is what the screen actually
 * consumes — locking the contract here protects against refactors that
 * accidentally change the stale window or stop exposing refetch.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import AsyncStorage from './__mocks__/asyncStorage';
import { useFigureDetail } from '../src/hooks/useFigureDetail';
import { isFigureDetailMiss } from '../src/shared/types';
import type { FigureDetailHit } from '../src/shared/types';

// Hit-only narrowing helper. Tests assert against figure / price fields
// which only exist on FigureDetailHit; the miss variant is exercised
// separately in figureApi.test.ts.
function asHit(d: unknown): FigureDetailHit {
  if (!d || typeof d !== 'object' || isFigureDetailMiss(d as never)) {
    throw new Error('expected FigureDetailHit');
  }
  return d as FigureDetailHit;
}

const store = AsyncStorage as { __reset: () => void };

const originalFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(() => {
  store.__reset();
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});
afterEach(() => {
  global.fetch = originalFetch;
});

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

function mockFigureDetailSuccess(overrides: { figure?: unknown; price?: unknown } = {}) {
  fetchMock
    .mockResolvedValueOnce({
      ok: true,
      json: async () =>
        overrides.figure ?? {
          figure_id: 'f1',
          name: 'Figure One',
          brand: 'B',
          line: 'L',
          series: '1',
          genre: 'g',
          year: null,
          canonical_image_url: null,
          exclusive_to: null,
          pack_size: 1,
          scale: null,
          match_quality: 'direct',
        },
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => overrides.price ?? { figureId: 'f1', avgSold: 20, soldHistory: [] },
    });
}

describe('useFigureDetail', () => {
  it('resolves with the merged figure + price + null aspirational fields', async () => {
    mockFigureDetailSuccess();
    const { result } = renderHook(() => useFigureDetail('f1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const hit = asHit(result.current.data);
    expect(hit.figure.figure_id).toBe('f1');
    expect(hit.price?.avgSold).toBe(20);
    expect(hit.rarity_tier).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('exposes refetch that triggers a fresh fetch bypassing the staleAfter gate', async () => {
    mockFigureDetailSuccess();
    const { result } = renderHook(() => useFigureDetail('f1'));
    await waitFor(() => expect(result.current.data).not.toBeNull());
    const firstFetchCount = fetchMock.mock.calls.length;

    // Set up the next pair of responses then call refetch.
    mockFigureDetailSuccess({ price: { figureId: 'f1', avgSold: 42, soldHistory: [] } });
    await act(async () => {
      await result.current.refetch();
    });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(firstFetchCount);
    await waitFor(() => expect(asHit(result.current.data).price?.avgSold).toBe(42));
  });

  it('marks data as stale when cache age exceeds the 24h threshold', async () => {
    // Preload cache with a 48h-old envelope so the hook hits the stale
    // branch on first mount.
    const stale = Date.now() - 48 * 3600 * 1000;
    await AsyncStorage.setItem(
      'fp:v1:figure:f1',
      JSON.stringify({
        data: {
          match_quality: 'direct',
          figure: {
            figure_id: 'f1',
            name: 'Cached',
            brand: '',
            line: '',
            series: '',
            genre: '',
            year: null,
            canonical_image_url: null,
            exclusive_to: null,
            pack_size: 1,
            scale: null,
          },
          price: null,
          rarity_tier: null,
          line_attributes: null,
          character_notes: null,
          collection: null,
          social: null,
          series_siblings: null,
          character_thread: null,
        },
        fetchedAt: stale,
      }),
    );

    // Mock the revalidation to never settle so we can observe the stale
    // state surfaced from cache.
    let release!: () => void;
    fetchMock.mockImplementation(
      () => new Promise(() => { release = () => {}; void release; }),
    );

    const { result } = renderHook(() => useFigureDetail('f1'));
    await waitFor(() => expect(asHit(result.current.data).figure.name).toBe('Cached'));
    expect(result.current.isStale).toBe(true);
    expect(result.current.cacheAgeSeconds).toBeGreaterThan(47 * 3600);
  });

  it('switches data when figureId changes', async () => {
    mockFigureDetailSuccess();
    const { result, rerender } = renderHook(({ id }: { id: string }) => useFigureDetail(id), {
      initialProps: { id: 'f1' },
    });
    await waitFor(() => expect(asHit(result.current.data).figure.figure_id).toBe('f1'));

    mockFigureDetailSuccess({
      figure: {
        figure_id: 'f2',
        name: 'Other',
        brand: '',
        line: '',
        series: '',
        genre: '',
        year: null,
        canonical_image_url: null,
        exclusive_to: null,
        pack_size: 1,
        scale: null,
        match_quality: 'direct',
      },
      price: null,
    });
    rerender({ id: 'f2' });
    await flush();
    await waitFor(() => expect(asHit(result.current.data).figure.figure_id).toBe('f2'));
  });
});
