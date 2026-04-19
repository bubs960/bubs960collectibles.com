/** Run with jest-expo only (imports `Share` from react-native). */
import { Share } from 'react-native';
import { shareFigure } from '../../src/shared/share';
import type { ApiFigureV1 } from '../../src/shared/types';

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

describe('shareFigure', () => {
  let shareSpy: jest.SpyInstance;

  beforeEach(() => {
    shareSpy = jest.spyOn(Share, 'share');
  });
  afterEach(() => {
    shareSpy.mockRestore();
    delete process.env.EXPO_PUBLIC_FIGUREPINNER_SITE;
  });

  it('builds a marketing URL using figure_id and posts message + url to Share.share', async () => {
    shareSpy.mockResolvedValue({ action: Share.sharedAction });
    const result = await shareFigure(figure());
    expect(result).toBe('shared');

    const arg = shareSpy.mock.calls[0][0] as { message: string; url: string; title: string };
    expect(arg.url).toBe('https://figurepinner.com/figure/mattel-elite-11-rey-mysterio');
    expect(arg.title).toBe('Rey Mysterio (Elite Series 11)');
    expect(arg.message).toContain('Rey Mysterio (Elite Series 11)');
    expect(arg.message).toContain('Elite Series 11');
    expect(arg.message).toContain('https://figurepinner.com/figure/mattel-elite-11-rey-mysterio');
  });

  it('returns "dismissed" when the user cancels the sheet', async () => {
    shareSpy.mockResolvedValue({ action: Share.dismissedAction });
    await expect(shareFigure(figure())).resolves.toBe('dismissed');
  });

  it('respects EXPO_PUBLIC_FIGUREPINNER_SITE for the share URL', async () => {
    process.env.EXPO_PUBLIC_FIGUREPINNER_SITE = 'https://staging.figurepinner.com';
    shareSpy.mockResolvedValue({ action: Share.sharedAction });
    await shareFigure(figure());
    const arg = shareSpy.mock.calls[0][0] as { url: string };
    expect(arg.url).toBe('https://staging.figurepinner.com/figure/mattel-elite-11-rey-mysterio');
  });

  it('URL-encodes figure ids that contain unsafe characters', async () => {
    shareSpy.mockResolvedValue({ action: Share.sharedAction });
    await shareFigure(figure({ figure_id: 'a/b c' }));
    const arg = shareSpy.mock.calls[0][0] as { url: string };
    expect(arg.url).toBe('https://figurepinner.com/figure/a%2Fb%20c');
  });

  it('omits "Series N" when series is empty', async () => {
    shareSpy.mockResolvedValue({ action: Share.sharedAction });
    await shareFigure(figure({ series: '' }));
    const arg = shareSpy.mock.calls[0][0] as { message: string };
    expect(arg.message).not.toMatch(/Series\s*$/);
    expect(arg.message).toContain('Rey Mysterio (Elite Series 11) · Elite');
  });
});
