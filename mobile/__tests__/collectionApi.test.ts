import {
  addToVault,
  addToWantlist,
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

describe('collection mutations', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.EXPO_PUBLIC_FIGUREPINNER_SITE;
  });

  it('addToVault POSTs to /api/vault with the web route body shape', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'v-1' }) });
    const res = await addToVault(figure(), 'jwt-token', { paid: 24, condition: 'Mint' });

    expect(res).toEqual({ id: 'v-1' });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://figurepinner.com/api/vault');
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

  it('addToWantlist POSTs to /api/wantlist with target_price', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'w-1' }) });
    await addToWantlist(figure(), 'tok', { target_price: 19 });

    const [url, opts] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://figurepinner.com/api/wantlist');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body as string);
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
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.target_price).toBe(0);
  });

  it('respects EXPO_PUBLIC_FIGUREPINNER_SITE override', async () => {
    process.env.EXPO_PUBLIC_FIGUREPINNER_SITE = 'https://staging.figurepinner.com';
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'x' }) });
    await addToVault(figure(), 'tok');
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'https://staging.figurepinner.com/api/vault',
    );
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

  it('propagates the Bearer token on every request', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'x' }) });
    await addToVault(figure(), 'token-a');
    await addToWantlist(figure(), 'token-b');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer token-a');
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer token-b');
  });
});
