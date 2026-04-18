import { renderLoreBand } from '../src/shared/renderLoreBand';
import type { ApiFigureV1, FigureDetail } from '../src/shared/types';

function apiFig(overrides: Partial<ApiFigureV1> = {}): ApiFigureV1 {
  return {
    figure_id: 'f1',
    name: 'Spider-Man',
    brand: 'Hasbro',
    line: 'Marvel Legends',
    series: '11',
    genre: 'marvel',
    year: 2021,
    canonical_image_url: null,
    exclusive_to: null,
    pack_size: 1,
    scale: null,
    ...overrides,
  };
}

function detail(overrides: Partial<FigureDetail> = {}): FigureDetail {
  return {
    figure: apiFig(),
    price: null,
    rarity_tier: null,
    line_attributes: null,
    character_notes: null,
    collection: null,
    social: null,
    series_siblings: null,
    character_thread: null,
    ...overrides,
  };
}

describe('renderLoreBand — null matrix', () => {
  it('hides zone when line_attributes + character_notes are both null', () => {
    const r = renderLoreBand(detail());
    expect(r.visible).toBe(false);
    expect(r.segments).toEqual([]);
  });

  it('renders line + era sentence when line_attributes has both', () => {
    const r = renderLoreBand(
      detail({
        line_attributes: { line_name: 'Retro Collection', era: '2020s', years: null },
      }),
    );
    expect(r.visible).toBe(true);
    expect(r.segments.find((s) => s.type === 'emphasis')?.value).toBe('Retro Collection');
    expect(r.segments.map((s) => s.value).join('')).toContain('2020s');
  });

  it('renders line-only sentence when era missing', () => {
    const r = renderLoreBand(
      detail({ line_attributes: { line_name: 'Hasbro Pulse', era: null, years: null } }),
    );
    expect(r.visible).toBe(true);
    expect(r.segments.map((s) => s.value).join('')).toContain('part of');
  });

  it('renders era-only sentence when line missing', () => {
    const r = renderLoreBand(
      detail({ line_attributes: { line_name: null, era: '1990s', years: null } }),
    );
    expect(r.visible).toBe(true);
    expect(r.segments.map((s) => s.value).join('')).toContain('1990s');
  });

  it('appends character_notes trimmed to two sentences', () => {
    const notes = 'A wall-crawler. With a dry wit. And too many variants to count.';
    const r = renderLoreBand(
      detail({
        line_attributes: { line_name: 'Retro', era: null, years: null },
        character_notes: notes,
      }),
    );
    const combined = r.segments.map((s) => s.value).join('');
    expect(combined).toContain('A wall-crawler.');
    expect(combined).toContain('With a dry wit.');
    expect(combined).not.toContain('too many variants');
  });

  it('is visible with only character_notes present', () => {
    const r = renderLoreBand(detail({ character_notes: 'A notable release.' }));
    expect(r.visible).toBe(true);
    expect(r.segments.map((s) => s.value).join('')).toContain('A notable release.');
  });

  it('defensively cleans literal (None) from name when using in lore', () => {
    const r = renderLoreBand(
      detail({
        figure: apiFig({ name: 'Rey Mysterio (None) (Elite Series 11)' }),
        line_attributes: { line_name: 'Elite', era: null, years: null },
      }),
    );
    expect(r.segments.map((s) => s.value).join('')).toContain('Rey Mysterio (Elite Series 11)');
  });
});
