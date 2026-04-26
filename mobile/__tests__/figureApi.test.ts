import {
  fetchFigure,
  fetchFigurePrice,
  fetchFigureDetail,
  FigureFetchError,
} from '../src/api/figureApi';
import { isFigureDetailMiss } from '../src/shared/types';

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
    it('hit: fetches figure then price (price keyed off canonical id) with aspirational fields nulled', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ figure_id: 'a', name: 'A', match_quality: 'direct' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ figureId: 'a', avgSold: 25 }),
        });
      const detail = await fetchFigureDetail('a');
      if (isFigureDetailMiss(detail)) throw new Error('expected hit');
      expect(detail.match_quality).toBe('direct');
      expect(detail.figure.figure_id).toBe('a');
      expect(detail.price?.avgSold).toBe(25);
      expect(detail.rarity_tier).toBeNull();
      expect(detail.collection).toBeNull();
      expect(detail.series_siblings).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("moved: keys the price call off the worker's canonical id, not the requested alias", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            figure_id: 'canonical-mint-a',
            name: 'A',
            match_quality: 'moved',
            original_figure_id: 'requested-alias',
            alias_source: 'figure_id_alias',
            alias_confidence: 1,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ figureId: 'canonical-mint-a', avgSold: 30 }),
        });
      const detail = await fetchFigureDetail('requested-alias');
      if (isFigureDetailMiss(detail)) throw new Error('expected hit');
      expect(detail.match_quality).toBe('moved');
      expect(detail.figure.alias_source).toBe('figure_id_alias');
      // Price URL must use canonical, not alias.
      const priceUrl = new URL(String(fetchMock.mock.calls[1][0]));
      expect(priceUrl.searchParams.get('figureId')).toBe('canonical-mint-a');
    });

    it('miss: returns FigureDetailMiss and skips the price call entirely', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          match_quality: 'not_found_but_logged',
          figure_id: null,
          original_figure_id: 'who-dis',
          canonical_image_url: null,
        }),
      });
      const detail = await fetchFigureDetail('who-dis');
      expect(isFigureDetailMiss(detail)).toBe(true);
      if (!isFigureDetailMiss(detail)) throw new Error('expected miss');
      expect(detail.original_figure_id).toBe('who-dis');
      // Only one fetch call — pricing is hit-only.
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('still resolves with price=null when only the price call fails', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ figure_id: 'a', name: 'A', match_quality: 'direct' }),
        })
        .mockResolvedValueOnce({ ok: false, status: 404, text: async () => '' });
      const detail = await fetchFigureDetail('a');
      if (isFigureDetailMiss(detail)) throw new Error('expected hit');
      expect(detail.figure.figure_id).toBe('a');
      expect(detail.price).toBeNull();
    });

    it('rejects when the figure call fails non-200 (network/server error, not a logged miss)', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 503, text: async () => 'gone' });
      await expect(fetchFigureDetail('missing')).rejects.toBeInstanceOf(FigureFetchError);
    });
  });
});
