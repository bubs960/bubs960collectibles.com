import { cleanFigureName, prettifySlug } from '../src/shared/cleanFigureName';

describe('cleanFigureName', () => {
  it('returns trimmed name as-is when clean', () => {
    expect(cleanFigureName('Spider-Man')).toBe('Spider-Man');
  });

  it('strips literal (None)', () => {
    expect(cleanFigureName('Spider-Man (None)')).toBe('Spider-Man');
  });

  it('strips literal (null) case-insensitive', () => {
    expect(cleanFigureName('Hulk (NULL)')).toBe('Hulk');
  });

  it('removes empty parens', () => {
    expect(cleanFigureName('Wolverine ()')).toBe('Wolverine');
  });

  it('collapses whitespace after stripping', () => {
    expect(cleanFigureName('Iron   Man  (None)')).toBe('Iron Man');
  });

  it('falls back to prettified slug when name is empty', () => {
    expect(cleanFigureName('', 'ghost-rider-2099')).toBe('Ghost Rider 2099');
  });

  it('falls back to prettified slug when name is only nullish parens', () => {
    expect(cleanFigureName('(None)', 'silver-surfer')).toBe('Silver Surfer');
  });

  it('handles the known ((None)) double-paren case from deriveName', () => {
    // deriveName builds `(variant)` around character_variant; if variant is the
    // string "None" we get "Rey Mysterio (None) (Elite Series 11)".
    expect(cleanFigureName('Rey Mysterio (None) (Elite Series 11)')).toBe(
      'Rey Mysterio (Elite Series 11)',
    );
  });
});

describe('prettifySlug', () => {
  it('converts hyphens to spaces and title-cases', () => {
    expect(prettifySlug('thor-ragnarok')).toBe('Thor Ragnarok');
  });
  it('handles underscores', () => {
    expect(prettifySlug('captain_america')).toBe('Captain America');
  });
});
