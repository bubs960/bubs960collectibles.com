import {
  addToVault,
  addToWantlist,
  deleteVaultItem,
  deleteWantlistItem,
  CollectionApiError,
} from '../src/api/collectionApi';
import type { ApiFigureV1 } from '../src/shared/types';

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

const WORKER = 'https://figurepinner-api.bubs960.workers.dev';

describe('collection mutations', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.EXPO_PUBLIC_FIGUREPINNER_API;
  });

  it('addToVault POSTs to the Worker /api/v1/vault with the full body', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'v-1' }) });
    const res = await addToVault(figure(), 'jwt-token', { paid: 24, condition: 'Mint' });

    expect(res).toEqual({ id: 'v-1' });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`${WORKER}/api/v1/vault`);
    expect(opts.method).toBe('POST');
    expect(opts.headers).toMatchObject({
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: 'Bearer jwt-token',
    });
    const body = JSON.parse(opts.body as string);
    expect(body).toEqual({
      figure_id: 'mattel-elite-11-rey-mysterio',
      name: 'Rey Mysterio (Elite Series 11)',
      brand: 'Mattel',
      line: 'Elite',
      genre: 'wrestling',
      paid: 24,
      condition: 'Mint',
    });
  });

  it('addToVault defaults paid=0 and condition=Loose', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'v-2' }) });
    await addToVault(figure(), 'tok');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.paid).toBe(0);
    expect(body.condition).toBe('Loose');
  });

  it('addToWantlist POSTs to the Worker /api/v1/wantlist', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'w-1' }) });
    await addToWantlist(figure(), 'tok', { target_price: 19 });
    expect(String(fetchMock.mock.calls[0][0])).toBe(`${WORKER}/api/v1/wantlist`);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toEqual({
      figure_id: 'mattel-elite-11-rey-mysterio',
      name: 'Rey Mysterio (Elite Series 11)',
      brand: 'Mattel',
      line: 'Elite',
      genre: 'wrestling',
      target_price: 19,
    });
  });

  it('addToWantlist defaults target_price=0', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'w-2' }) });
    await addToWantlist(figure(), 'tok');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).target_price).toBe(0);
  });

  it('deleteVaultItem hits /api/v1/vault/items/:id (note: "items")', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });
    await deleteVaultItem('v-abc', 'tok');
    const [url, opts] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(`${WORKER}/api/v1/vault/items/v-abc`);
    expect(opts.method).toBe('DELETE');
    expect(opts.headers.Authorization).toBe('Bearer tok');
  });

  it('deleteWantlistItem hits /api/v1/wantlist/items/:id (plural, normalized from spec typo)', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });
    await deleteWantlistItem('w-abc', 'tok');
    expect(String(fetchMock.mock.calls[0][0])).toBe(`${WORKER}/api/v1/wantlist/items/w-abc`);
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
  });

  it('URL-encodes delete item ids', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });
    await deleteVaultItem('a/b c', 'tok');
    expect(String(fetchMock.mock.calls[0][0])).toBe(`${WORKER}/api/v1/vault/items/a%2Fb%20c`);
  });

  it('respects EXPO_PUBLIC_FIGUREPINNER_API override', async () => {
    process.env.EXPO_PUBLIC_FIGUREPINNER_API = 'https://staging-api.example.com';
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'x' }) });
    await addToVault(figure(), 'tok');
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://staging-api.example.com/api/v1/vault');
  });

  it('throws CollectionApiError with status + body on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });
    let caught: unknown;
    try {
      await addToVault(figure(), 'tok');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(CollectionApiError);
    expect((caught as CollectionApiError).status).toBe(401);
    expect((caught as CollectionApiError).body).toBe('Unauthorized');
  });

  it('DELETE errors surface CollectionApiError too', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, text: async () => 'Not found' });
    let caught: unknown;
    try {
      await deleteVaultItem('missing', 'tok');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(CollectionApiError);
    expect((caught as CollectionApiError).status).toBe(404);
  });

  it('propagates the Bearer token on every request', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'x' }) });
    await addToVault(figure(), 'token-a');
    await addToWantlist(figure(), 'token-b');
    await deleteVaultItem('v-1', 'token-c');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer token-a');
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer token-b');
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer token-c');
  });
});
