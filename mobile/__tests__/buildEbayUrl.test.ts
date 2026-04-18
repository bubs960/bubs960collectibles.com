import { buildEbayUrl } from '../src/api/figureApi';
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

describe('buildEbayUrl', () => {
  const origEnv = process.env.EXPO_PUBLIC_EBAY_CAMPAIGN_ID;
  afterEach(() => {
    // eslint-disable-next-line no-param-reassign
    process.env.EXPO_PUBLIC_EBAY_CAMPAIGN_ID = origEnv;
  });

  it('URL-encodes the search terms', () => {
    const url = buildEbayUrl(figure());
    // Rey Mysterio (…) contains spaces and parens — both must be percent-encoded.
    expect(url).toContain('_nkw=Mattel%20Elite%2011%20Rey%20Mysterio%20(Elite%20Series%2011)');
  });

  it('includes the full affiliate template (LH_BIN, mkcid, mkrid, toolid)', () => {
    const url = buildEbayUrl(figure());
    expect(url).toContain('_sop=15');
    expect(url).toContain('LH_BIN=1');
    expect(url).toContain('mkcid=1');
    expect(url).toContain('mkrid=711-53200-19255-0');
    expect(url).toContain('toolid=10001');
  });

  it('uses the default campid when env is unset', () => {
    delete process.env.EXPO_PUBLIC_EBAY_CAMPAIGN_ID;
    expect(buildEbayUrl(figure())).toContain('campid=5339147406');
  });

  it('uses env campid when provided', () => {
    process.env.EXPO_PUBLIC_EBAY_CAMPAIGN_ID = '9999999999';
    expect(buildEbayUrl(figure())).toContain('campid=9999999999');
  });

  it('tags mobile-sourced clicks with customid=figurepinner', () => {
    expect(buildEbayUrl(figure())).toContain('customid=figurepinner');
  });

  it('points at the US ebay.com sch endpoint', () => {
    expect(buildEbayUrl(figure())).toMatch(/^https:\/\/www\.ebay\.com\/sch\/i\.html\?/);
  });
});
