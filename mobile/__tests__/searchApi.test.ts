import { searchFigures } from '../src/api/searchApi';

describe('searchFigures', () => {
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

  it('short-circuits to empty when the query is under 2 chars', async () => {
    await expect(searchFigures('')).resolves.toEqual([]);
    await expect(searchFigures(' ')).resolves.toEqual([]);
    await expect(searchFigures('a')).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls the Next site at /api/v1/search with q and limit', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ figures: [] }),
    });

    await searchFigures('rey');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [urlArg] = fetchMock.mock.calls[0];
    const url = new URL(String(urlArg));
    expect(url.pathname).toBe('/api/v1/search');
    expect(url.origin).toBe('https://figurepinner.com');
    expect(url.searchParams.get('q')).toBe('rey');
    expect(url.searchParams.get('limit')).toBe('8');
  });

  it('respects EXPO_PUBLIC_FIGUREPINNER_SITE override', async () => {
    process.env.EXPO_PUBLIC_FIGUREPINNER_SITE = 'https://staging.figurepinner.com';
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ figures: [] }) });

    await searchFigures('rey mysterio');
    const [urlArg] = fetchMock.mock.calls[0];
    expect(String(urlArg)).toContain('https://staging.figurepinner.com/api/v1/search');
  });

  it('clamps limit to the server max of 20', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ figures: [] }) });
    await searchFigures('rey', { limit: 1000 });
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get('limit')).toBe('20');
  });

  it('returns figures array on success', async () => {
    const result = [
      {
        figure_id: 'x',
        name: 'X',
        brand: 'B',
        line: 'L',
        series: '1',
        genre: 'g',
        year: null,
        image: null,
      },
    ];
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ figures: result }) });
    await expect(searchFigures('rey')).resolves.toEqual(result);
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
    const opts = fetchMock.mock.calls[0][1];
    expect(opts.signal).toBe(controller.signal);
  });
});
