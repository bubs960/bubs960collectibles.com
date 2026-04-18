import { buildFigureId, slugify } from '../src/shared/figureId';

describe('slugify', () => {
  it('lowercases and joins tokens with dashes', () => {
    expect(slugify('Rey Mysterio')).toBe('rey-mysterio');
  });
  it('collapses punctuation', () => {
    expect(slugify("André the Giant!")).toBe('andre-the-giant');
  });
  it('strips accents', () => {
    expect(slugify('Úndertaker')).toBe('undertaker');
  });
  it('trims leading / trailing dashes', () => {
    expect(slugify('  Mattel  ')).toBe('mattel');
    expect(slugify('---Wolverine---')).toBe('wolverine');
  });
});

describe('buildFigureId', () => {
  it('produces brand-line-series-character ids', () => {
    expect(
      buildFigureId({ brand: 'Mattel', line: 'Elite', series: '11', name: 'Rey Mysterio' }),
    ).toBe('mattel-elite-11-rey-mysterio');
  });

  it('strips "(Line Series N)" suffixes from the name before slugifying', () => {
    expect(
      buildFigureId({
        brand: 'Mattel',
        line: 'Elite',
        series: '11',
        name: 'Rey Mysterio (Elite Series 11)',
      }),
    ).toBe('mattel-elite-11-rey-mysterio');
  });

  it('keeps character variants intact (different id from base character)', () => {
    // Masked variant is part of the character identity, not the line tag.
    expect(
      buildFigureId({
        brand: 'Mattel',
        line: 'Elite',
        series: '11',
        name: 'Rey Mysterio (Masked) (Elite Series 11)',
      }),
    ).toBe('mattel-elite-11-rey-mysterio-masked');
  });

  it('handles multi-word brand + line slugs', () => {
    expect(
      buildFigureId({
        brand: 'Hasbro Pulse',
        line: 'Marvel Legends',
        series: '5',
        name: 'Wolverine',
      }),
    ).toBe('hasbro-pulse-marvel-legends-5-wolverine');
  });

  it('coerces numeric series values to strings', () => {
    expect(
      buildFigureId({ brand: 'Mattel', line: 'Elite', series: 11, name: 'Rey Mysterio' }),
    ).toBe('mattel-elite-11-rey-mysterio');
  });
});
