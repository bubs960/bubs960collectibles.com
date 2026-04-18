import { renderLoreBand } from '../src/shared/renderLoreBand';
import type { FigureDetailResponse } from '../src/shared/types';

function base(overrides: Partial<FigureDetailResponse> = {}): FigureDetailResponse {
  return {
    figure_id: 'f1',
    slug: 'spider-man',
    name: 'Spider-Man',
    character_slug: 'spider-man',
    brand: 'Hasbro',
    series: 'Marvel Legends',
    release_year: 2021,
    rarity_tier: 'common',
    image_url: null,
    line_attributes: null,
    character_notes: null,
    pricing: null,
    collection: null,
    social: null,
    series_siblings: null,
    character_thread: null,
    ...overrides,
  };
}

describe('renderLoreBand — null matrix', () => {
  it('hides zone when line_attributes + character_notes are both null', () => {
    const r = renderLoreBand(base());
    expect(r.visible).toBe(false);
    expect(r.segments).toEqual([]);
  });

  it('renders line + era sentence when line_attributes has both', () => {
    const r = renderLoreBand(
      base({
        line_attributes: { line_name: 'Retro Collection', era: '2020s', years: null },
      }),
    );
    expect(r.visible).toBe(true);
    expect(r.segments.find((s) => s.type === 'emphasis')?.value).toBe('Retro Collection');
    expect(r.segments.map((s) => s.value).join('')).toContain('2020s');
  });

  it('renders line-only sentence when era missing', () => {
    const r = renderLoreBand(
      base({ line_attributes: { line_name: 'Hasbro Pulse', era: null, years: null } }),
    );
    expect(r.visible).toBe(true);
    expect(r.segments.map((s) => s.value).join('')).toContain('part of');
  });

  it('renders era-only sentence when line missing', () => {
    const r = renderLoreBand(
      base({ line_attributes: { line_name: null, era: '1990s', years: null } }),
    );
    expect(r.visible).toBe(true);
    expect(r.segments.map((s) => s.value).join('')).toContain('1990s');
  });

  it('appends character_notes trimmed to two sentences', () => {
    const notes = 'A wall-crawler. With a dry wit. And too many variants to count.';
    const r = renderLoreBand(
      base({
        line_attributes: { line_name: 'Retro', era: null, years: null },
        character_notes: notes,
      }),
    );
    const combined = r.segments.map((s) => s.value).join('');
    expect(combined).toContain('A wall-crawler.');
    expect(combined).toContain('With a dry wit.');
    expect(combined).not.toContain('too many variants');
  });

  it('falls back to slug-prettified name when name is null', () => {
    const r = renderLoreBand(
      base({
        name: null,
        slug: 'ghost-rider',
        line_attributes: { line_name: 'Retro', era: null, years: null },
      }),
    );
    expect(r.segments.map((s) => s.value).join('')).toContain('Ghost Rider');
  });

  it('is visible with only character_notes present', () => {
    const r = renderLoreBand(base({ character_notes: 'A notable release.' }));
    expect(r.visible).toBe(true);
    expect(r.segments.map((s) => s.value).join('')).toContain('A notable release.');
  });
});
