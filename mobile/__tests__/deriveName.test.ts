import { deriveName, titleCaseSlug, type KBFigure } from '../src/shared/kb';

function kb(overrides: Partial<KBFigure> = {}): KBFigure {
  return {
    figure_id: 'mattel-elite-11-rey-mysterio',
    v1_figure_id: 'legacy-id',
    fandom: 'wrestling',
    sub_fandom: null,
    character_canonical: 'rey-mysterio',
    character_variant: null,
    manufacturer: 'mattel',
    product_line: 'elite',
    release_wave: '11',
    scale: null,
    pack_size: 1,
    exclusive_to: null,
    canonical_image_url: null,
    ...overrides,
  };
}

describe('deriveName (ported from figurepinner-site kb.ts)', () => {
  it('uses explicit name when present', () => {
    expect(deriveName(kb({ name: 'Override Name' }))).toBe('Override Name');
  });

  it('builds "Character (Line Series X)" when no name', () => {
    expect(deriveName(kb())).toBe('Rey Mysterio (Elite Series 11)');
  });

  it('includes variant in parens between character and line', () => {
    expect(
      deriveName(kb({ character_variant: 'Masked Edition' })),
    ).toBe('Rey Mysterio (Masked Edition) (Elite Series 11)');
  });

  it('omits "Series X" when release_wave is empty', () => {
    expect(deriveName(kb({ release_wave: '' }))).toBe('Rey Mysterio (Elite)');
  });

  it('title-cases multi-word product_line slugs', () => {
    expect(deriveName(kb({ product_line: 'wwe-elite' }))).toBe('Rey Mysterio (Wwe Elite Series 11)');
  });
});

describe('titleCaseSlug', () => {
  it('handles single words', () => {
    expect(titleCaseSlug('mattel')).toBe('Mattel');
  });
  it('splits on hyphens', () => {
    expect(titleCaseSlug('rey-mysterio')).toBe('Rey Mysterio');
  });
});
