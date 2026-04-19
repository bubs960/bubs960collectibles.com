/**
 * @jest-environment jsdom
 *
 * Local-first optimistic collection hook. Clerk is mocked (see
 * __mocks__/clerkExpo.ts) so tests can toggle signed-in state without a
 * real provider. The Worker endpoints are mocked via global fetch.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import AsyncStorage from './__mocks__/asyncStorage';
import { __mock as clerkMock } from './__mocks__/clerkExpo';
import { useCollection } from '../src/hooks/useCollection';
import { collectionStore } from '../src/collection/localStore';
import type { ApiFigureV1 } from '../src/shared/types';

const store = AsyncStorage as { __reset: () => void };
const originalFetch = global.fetch;
let fetchMock: jest.Mock;

function figure(overrides: Partial<ApiFigureV1> = {}): ApiFigureV1 {
  return {
    figure_id: 'mattel-elite-11-rey-mysterio',
    name: 'Rey Mysterio (Elite Series 11)',
    brand: 'Mattel',
    line: 'Elite',
    series: '11',
    genre: 'wrestling',
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
  clerkMock.signOut();
  clerkMock.resetTokenFactory();
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});
afterEach(() => {
  global.fetch = originalFetch;
});

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

describe('useCollection (local-first)', () => {
  it('starts with owned=false and wanted=false for a new figure', () => {
    const { result } = renderHook(() => useCollection(() => figure()));
    expect(result.current.owned).toBe(false);
    expect(result.current.wanted).toBe(false);
  });

  it('toggleOwned flips local state immediately even when signed out (no network call)', async () => {
    const { result } = renderHook(() => useCollection(() => figure()));
    await act(async () => {
      await result.current.toggleOwned();
    });
    expect(result.current.owned).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(collectionStore.has('vault', 'mattel-elite-11-rey-mysterio')).toBe(true);
  });

  it('toggleWanted mirrors toggleOwned for the wantlist', async () => {
    const { result } = renderHook(() => useCollection(() => figure()));
    await act(async () => {
      await result.current.toggleWanted();
    });
    expect(result.current.wanted).toBe(true);
    expect(collectionStore.has('wantlist', 'mattel-elite-11-rey-mysterio')).toBe(true);
  });

  it('fires POST /api/v1/vault and attaches server_id when signed in', async () => {
    clerkMock.signIn('user_1');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'server-vault-123' }),
    });

    const { result } = renderHook(() => useCollection(() => figure()));
    await act(async () => {
      await result.current.toggleOwned();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/v1/vault');
    expect(opts.method).toBe('POST');
    expect(opts.headers.Authorization).toBe('Bearer jwt-user_1');

    // Server id is persisted back onto the local item so a later
    // toggle-off can send DELETE with that id.
    await waitFor(() =>
      expect(collectionStore.itemFor('vault', 'mattel-elite-11-rey-mysterio')?.server_id).toBe(
        'server-vault-123',
      ),
    );
  });

  it('server failure does not roll back the local add (local-first)', async () => {
    clerkMock.signIn('user_1');
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'internal',
    });

    const { result } = renderHook(() => useCollection(() => figure()));
    await act(async () => {
      await result.current.toggleOwned();
    });

    // Local state still shows owned=true. The error is captured for UX
    // surfacing but the user's tap wasn't undone.
    expect(result.current.owned).toBe(true);
    await waitFor(() => expect(result.current.error).not.toBeNull());
  });

  it('DELETE fires on toggle-off when the item has a server_id', async () => {
    clerkMock.signIn('user_1');
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'server-vault-99' }) })
      .mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() => useCollection(() => figure()));
    await act(async () => {
      await result.current.toggleOwned();
    });
    await waitFor(() =>
      expect(collectionStore.itemFor('vault', 'mattel-elite-11-rey-mysterio')?.server_id).toBe(
        'server-vault-99',
      ),
    );

    await act(async () => {
      await result.current.toggleOwned();
    });
    expect(result.current.owned).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const deleteCall = fetchMock.mock.calls[1];
    expect(deleteCall[1].method).toBe('DELETE');
    expect(String(deleteCall[0])).toContain('/api/v1/vault/items/server-vault-99');
  });

  it('no DELETE fires on toggle-off for a pending (un-synced) local add', async () => {
    // Never signed in → local add has no server_id.
    const { result } = renderHook(() => useCollection(() => figure()));
    await act(async () => {
      await result.current.toggleOwned();
    });
    await act(async () => {
      await result.current.toggleOwned();
    });
    expect(result.current.owned).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is a no-op when the figure getter returns null', async () => {
    const { result } = renderHook(() => useCollection(() => null));
    await act(async () => {
      await result.current.toggleOwned();
    });
    expect(result.current.owned).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    void flush;
  });
});
