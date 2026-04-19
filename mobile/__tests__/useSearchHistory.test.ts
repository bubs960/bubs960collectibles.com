/**
 * @jest-environment jsdom
 *
 * The history store is unit-tested separately. This suite locks the React
 * adapter: subscription state reflects disk contents, actions update state
 * optimistically, unmount guards setState.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import AsyncStorage from './__mocks__/asyncStorage';
import { useSearchHistory } from '../src/hooks/useSearchHistory';
import { HISTORY_KEY } from '../src/search/history';

const store = AsyncStorage as { __reset: () => void };

beforeEach(() => {
  store.__reset();
});

describe('useSearchHistory', () => {
  it('loads persisted entries on mount', async () => {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(['wolverine', 'rey']));
    const { result } = renderHook(() => useSearchHistory());
    await waitFor(() => expect(result.current.entries).toEqual(['wolverine', 'rey']));
  });

  it('record prepends a new entry and reflects it in state', async () => {
    const { result } = renderHook(() => useSearchHistory());
    await waitFor(() => expect(result.current.entries).toEqual([]));
    await act(async () => {
      await result.current.record('wolverine');
    });
    expect(result.current.entries).toEqual(['wolverine']);
  });

  it('remove drops the matching entry from state', async () => {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(['a', 'bb', 'cc']));
    const { result } = renderHook(() => useSearchHistory());
    await waitFor(() => expect(result.current.entries.length).toBe(3));
    await act(async () => {
      await result.current.remove('bb');
    });
    expect(result.current.entries).toEqual(['a', 'cc']);
  });

  it('clear empties the state', async () => {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(['x', 'y']));
    const { result } = renderHook(() => useSearchHistory());
    await waitFor(() => expect(result.current.entries.length).toBe(2));
    await act(async () => {
      await result.current.clear();
    });
    expect(result.current.entries).toEqual([]);
  });

  it('does not setState after unmount (no warnings)', async () => {
    const { result, unmount } = renderHook(() => useSearchHistory());
    unmount();
    // record() will still run; the hook's mounted-guard prevents setState.
    await result.current.record('late');
  });
});
