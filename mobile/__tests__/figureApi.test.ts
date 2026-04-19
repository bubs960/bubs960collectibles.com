import {
  fetchFigure,
  fetchFigurePrice,
  fetchFigureDetail,
  FigureFetchError,
} from '../src/api/figureApi';

const WORKER = 'https://figurepinner-api.bubs960.workers.dev';

describe('figureApi', () => {
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

  describe('fetchFigure', () => {
    it('GETs /api/v1/figure/:id with X-Client header and URL-encodes the id', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ figure_id: 'a/b' }),
      });
      await fetchFigure('a/b');
      const [url, opts] = fetchMock.mock.calls[0];
      expect(String(url)).toBe(`${WORKER}/api/v1/figure/a%2Fb`);
      expect(opts.headers['X-Client']).toBe('figurepinner-mobile/0.1');
    });

    it('throws FigureFetchError with status + body on non-ok', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not found',
      });
      let caught: unknown;
      try {
        await fetchFigure('missing');
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(FigureFetchError);
      expect((caught as FigureFetchError).status).toBe(404);
      expect((caught as FigureFetchError).body).toBe('Not found');
    });

    it('attaches a Bearer token when authToken is provided', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      await fetchFigure('id', { authToken: 'tok' });
      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
    });

    it('omits the Authorization header for anonymous calls', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      await fetchFigure('id');
      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
    });

    it('forwards X-Image-Quality when imageQuality is set', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      await fetchFigure('id', { imageQuality: 'thumb' });
      expect(fetchMock.mock.calls[0][1].headers['X-Image-Quality']).toBe('thumb');
    });

    it('respects EXPO_PUBLIC_FIGUREPINNER_API override', async () => {
      process.env.EXPO_PUBLIC_FIGUREPINNER_API = 'https://staging-api.example.com';
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      await fetchFigure('id');
      expect(String(fetchMock.mock.calls[0][0])).toContain('https://staging-api.example.com');
    });
  });

  describe('fetchFigurePrice', () => {
    it('GETs /api/v1/figure-price?figureId=...', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ figureId: 'id' }) });
      await fetchFigurePrice('id');
      const url = new URL(String(fetchMock.mock.calls[0][0]));
      expect(url.pathname).toBe('/api/v1/figure-price');
      expect(url.searchParams.get('figureId')).toBe('id');
    });

    it('returns null on non-ok rather than throwing (best-effort price)', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500, text: async () => '' });
      await expect(fetchFigurePrice('id')).resolves.toBeNull();
    });

    it('returns null on network error rather than throwing', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('network down'));
      await expect(fetchFigurePrice('id')).resolves.toBeNull();
    });
  });

  describe('fetchFigureDetail', () => {
    it('parallels figure + price; returns merged shape with aspirational fields null', async () => {
      // First call (figure): success. Second call (price): success.
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ figure_id: 'a', name: 'A' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ figureId: 'a', avgSold: 25 }),
        });
      const detail = await fetchFigureDetail('a');
      expect(detail.figure.figure_id).toBe('a');
      expect(detail.price?.avgSold).toBe(25);
      expect(detail.rarity_tier).toBeNull();
      expect(detail.collection).toBeNull();
      expect(detail.series_siblings).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('still resolves with price=null when only the price call fails', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: true, json: async () => ({ figure_id: 'a', name: 'A' }) })
        .mockResolvedValueOnce({ ok: false, status: 404, text: async () => '' });
      const detail = await fetchFigureDetail('a');
      expect(detail.figure.figure_id).toBe('a');
      expect(detail.price).toBeNull();
    });

    it('rejects when the figure call fails (figure metadata is required)', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: false, status: 404, text: async () => 'gone' })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      await expect(fetchFigureDetail('missing')).rejects.toBeInstanceOf(FigureFetchError);
    });
  });
});
