/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import AsyncStorage from './__mocks__/asyncStorage';
import { useCollectionList } from '../src/hooks/useCollectionList';
import { collectionStore } from '../src/collection/localStore';
import type { ApiFigureV1 } from '../src/shared/types';

const store = AsyncStorage as { __reset: () => void };

function figure(overrides: Partial<ApiFigureV1> = {}): ApiFigureV1 {
  return {
    figure_id: 'f-1',
    name: 'Figure',
    brand: 'B',
    line: 'L',
    series: '1',
    genre: 'g',
    year: null,
    canonical_image_url: null,
    exclusive_to: null,
    pack_size: 1,
    scale: null,
    ...overrides,
  };
}

beforeEach(async () => {
  store.__reset();
  await collectionStore.reset();
});

describe('useCollectionList', () => {
  it('returns the current vault list (empty by default)', async () => {
    const { result } = renderHook(() => useCollectionList('vault'));
    expect(result.current).toEqual([]);
  });

  it('re-renders when the store emits for the matching kind', async () => {
    const { result } = renderHook(() => useCollectionList('vault'));
    await act(async () => {
      await collectionStore.addOwned(figure({ figure_id: 'a' }));
    });
    await waitFor(() =>
      expect(result.current.map((i) => i.figure_id)).toEqual(['a']),
    );
  });

  it('returns an independent snapshot for wantlist vs vault', async () => {
    const { result: vaultResult } = renderHook(() => useCollectionList('vault'));
    const { result: wantResult } = renderHook(() => useCollectionList('wantlist'));

    await act(async () => {
      await collectionStore.addOwned(figure({ figure_id: 'owned' }));
      await collectionStore.addWanted(figure({ figure_id: 'wanted' }));
    });
    await waitFor(() => expect(vaultResult.current.map((i) => i.figure_id)).toEqual(['owned']));
    expect(wantResult.current.map((i) => i.figure_id)).toEqual(['wanted']);
  });

  it('loads persisted data from AsyncStorage on first mount', async () => {
    await AsyncStorage.setItem(
      'fp:v1:collection:vault',
      JSON.stringify([
        {
          figure_id: 'persisted',
          name: 'Persisted',
          brand: '',
          line: '',
          series: '',
          genre: '',
          image_url: null,
          added_at: 1,
          server_id: null,
        },
      ]),
    );
    const { result } = renderHook(() => useCollectionList('vault'));
    await waitFor(() =>
      expect(result.current.map((i) => i.figure_id)).toContain('persisted'),
    );
  });

  it('unsubscribes on unmount so a later mutation does not re-render the dead hook', async () => {
    const { result, unmount } = renderHook(() => useCollectionList('vault'));
    await act(async () => {
      await collectionStore.addOwned(figure({ figure_id: 'a' }));
    });
    await waitFor(() => expect(result.current.length).toBe(1));

    unmount();
    // No throw / no warning.
    await act(async () => {
      await collectionStore.addOwned(figure({ figure_id: 'b' }));
    });
  });
});
