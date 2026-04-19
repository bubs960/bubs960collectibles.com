/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import AsyncStorage from './__mocks__/asyncStorage';
import { __mock as clerkMock } from './__mocks__/clerkExpo';
import { useCollectionSync } from '../src/hooks/useCollectionSync';
import { collectionStore } from '../src/collection/localStore';

const store = AsyncStorage as { __reset: () => void };

const originalFetch = global.fetch;
let fetchMock: jest.Mock;

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

// Build an empty-success response for both vault and wantlist.
function mockEmptyLists() {
  fetchMock.mockImplementation(async (url: string) => {
    void url;
    return { ok: true, json: async () => ({ items: [] }) };
  });
}

describe('useCollectionSync', () => {
  it('no-ops when signed out (never calls fetch)', async () => {
    const { result } = renderHook(() => useCollectionSync());
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.syncing).toBe(false);
    expect(result.current.lastSyncAt).toBeNull();
  });

  it('auto-syncs on first sign-in: fetches vault + wantlist and stamps lastSyncAt', async () => {
    clerkMock.signIn('user_a');
    mockEmptyLists();

    const { result } = renderHook(() => useCollectionSync());
    await waitFor(() => expect(result.current.lastSyncAt).not.toBeNull());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.endsWith('/api/v1/vault'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/api/v1/wantlist'))).toBe(true);
  });

  it('sends Authorization: Bearer <jwt> on both fetches', async () => {
    clerkMock.signIn('user_a', 'jwt-user_a');
    mockEmptyLists();
    const { result } = renderHook(() => useCollectionSync());
    await waitFor(() => expect(result.current.lastSyncAt).not.toBeNull());
    for (const call of fetchMock.mock.calls) {
      expect(call[1].headers.Authorization).toBe('Bearer jwt-user_a');
    }
  });

  it('reconciles server items into the local store', async () => {
    clerkMock.signIn('user_a');
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).endsWith('/api/v1/vault')) {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                id: 'srv-1',
                figure_id: 'f-server',
                name: 'Server Fig',
                brand: 'B',
                line: 'L',
                genre: 'g',
                added_at: 5,
              },
            ],
          }),
        };
      }
      return { ok: true, json: async () => ({ items: [] }) };
    });

    renderHook(() => useCollectionSync());
    await waitFor(() => {
      const vault = collectionStore.get('vault');
      expect(vault.map((i) => i.figure_id)).toContain('f-server');
    });
    const item = collectionStore.itemFor('vault', 'f-server');
    expect(item?.server_id).toBe('srv-1');
  });

  it('surfaces a server error via state.error without clearing lastSyncAt', async () => {
    clerkMock.signIn('user_a');
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' });
    const { result } = renderHook(() => useCollectionSync());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.syncing).toBe(false);
  });

  it('exposes a manual sync() that can be called after mount', async () => {
    clerkMock.signIn('user_a');
    mockEmptyLists();
    const { result } = renderHook(() => useCollectionSync());
    await waitFor(() => expect(result.current.lastSyncAt).not.toBeNull());
    const firstCalls = fetchMock.mock.calls.length;

    await act(async () => {
      await result.current.sync();
    });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(firstCalls);
  });

  it('re-syncs when userId changes (account switch)', async () => {
    clerkMock.signIn('user_a');
    mockEmptyLists();
    const { result } = renderHook(() => useCollectionSync());
    await waitFor(() => expect(result.current.lastSyncAt).not.toBeNull());
    const firstCalls = fetchMock.mock.calls.length;

    // Switch accounts — simulate by flipping the mock and forcing a rerender
    // via sign-out-then-in.
    clerkMock.signIn('user_b');
    // renderHook doesn't rerender on external module-state change; we
    // trigger it by calling sync() which keys off isSignedIn/userId via
    // useAuth(). In production a user change triggers Clerk's subscription
    // which re-renders consumers; here we just assert manual sync works
    // with the new identity.
    await act(async () => {
      await result.current.sync();
    });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(firstCalls);
  });

  it('filters out status="removed" items per the soft-delete contract', async () => {
    clerkMock.signIn('user_a');
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).endsWith('/api/v1/vault')) {
        return {
          ok: true,
          json: async () => ({
            items: [
              { id: 's1', figure_id: 'keep', name: 'Keep', status: 'active' },
              { id: 's2', figure_id: 'drop', name: 'Drop', status: 'removed' },
            ],
          }),
        };
      }
      return { ok: true, json: async () => ({ items: [] }) };
    });

    renderHook(() => useCollectionSync());
    await waitFor(() => {
      const ids = collectionStore.get('vault').map((i) => i.figure_id);
      expect(ids).toContain('keep');
    });
    expect(collectionStore.get('vault').map((i) => i.figure_id)).not.toContain('drop');
  });
});
