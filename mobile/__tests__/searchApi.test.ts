import { searchFigures } from '../src/api/searchApi';

const WORKER = 'https://figurepinner-api.bubs960.workers.dev';

describe('searchFigures', () => {
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

  it('short-circuits to empty when the query is under 2 chars', async () => {
    await expect(searchFigures('')).resolves.toEqual([]);
    await expect(searchFigures(' ')).resolves.toEqual([]);
    await expect(searchFigures('a')).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls the Worker at /api/v1/search with q and limit', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ figures: [] }) });
    await searchFigures('rey');
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.origin).toBe(WORKER);
    expect(url.pathname).toBe('/api/v1/search');
    expect(url.searchParams.get('q')).toBe('rey');
    expect(url.searchParams.get('limit')).toBe('8');
  });

  it('respects EXPO_PUBLIC_FIGUREPINNER_API override', async () => {
    process.env.EXPO_PUBLIC_FIGUREPINNER_API = 'https://staging-api.example.com';
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ figures: [] }) });
    await searchFigures('rey mysterio');
    expect(String(fetchMock.mock.calls[0][0])).toContain('https://staging-api.example.com/api/v1/search');
  });

  it('clamps limit to the server max of 20', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ figures: [] }) });
    await searchFigures('rey', { limit: 1000 });
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get('limit')).toBe('20');
  });

  it('passes X-FP-Key header when fpKey is provided (authed callers get full projection)', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ figures: [] }) });
    await searchFigures('rey', { fpKey: 'fp-secret' });
    const opts = fetchMock.mock.calls[0][1];
    expect(opts.headers['X-FP-Key']).toBe('fp-secret');
  });

  it('omits X-FP-Key for public callers', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ figures: [] }) });
    await searchFigures('rey');
    const opts = fetchMock.mock.calls[0][1];
    expect(opts.headers['X-FP-Key']).toBeUndefined();
  });

  it('returns figures with server-provided figure_id and image passed through', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        figures: [
          {
            figure_id: 'server-id',
            name: 'X',
            brand: 'B',
            line: 'L',
            series: '1',
            genre: 'g',
            year: 2024,
            image: 'https://cdn.example/x.jpg',
          },
        ],
      }),
    });
    const results = await searchFigures('rey', { fpKey: 'fp-secret' });
    expect(results[0].figure_id).toBe('server-id');
    expect(results[0].image).toBe('https://cdn.example/x.jpg');
    expect(results[0].year).toBe(2024);
  });

  it('synthesizes figure_id client-side when the anti-scrape projection omits it', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        figures: [
          // Public projection: no figure_id, no image.
          {
            name: 'Rey Mysterio (Elite Series 11)',
            brand: 'Mattel',
            line: 'Elite',
            series: '11',
            genre: 'wrestling',
          },
        ],
      }),
    });
    const results = await searchFigures('rey');
    expect(results[0].figure_id).toBe('mattel-elite-11-rey-mysterio');
    expect(results[0].image).toBeNull();
  });

  it('returns [] on non-ok response rather than throwing', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    await expect(searchFigures('rey')).resolves.toEqual([]);
  });

  it('returns [] when the body omits figures', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await expect(searchFigures('rey')).resolves.toEqual([]);
  });

  it('passes through signal for abort support', async () => {
    const controller = new AbortController();
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ figures: [] }) });
    await searchFigures('rey', { signal: controller.signal });
    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
  });
});
