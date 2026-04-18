import { formatPriceDollars, formatRelativeDate, formatShortDate } from '../src/shared/formatters';

describe('formatPriceDollars', () => {
  it('returns dash for null / undefined', () => {
    expect(formatPriceDollars(null)).toBe('—');
    expect(formatPriceDollars(undefined)).toBe('—');
  });
  it('formats small values without decimals per the price-guide convention', () => {
    expect(formatPriceDollars(24.5)).toBe('$25');
    expect(formatPriceDollars(0)).toBe('$0');
  });
  it('formats >=1000 with thousands separators, no decimals', () => {
    expect(formatPriceDollars(1234)).toBe('$1,234');
    expect(formatPriceDollars(12_500)).toBe('$12,500');
  });
});

describe('formatRelativeDate', () => {
  const NOW = new Date('2026-04-18T12:00:00Z');
  it('uses "just now" under a minute', () => {
    expect(formatRelativeDate(new Date(NOW.getTime() - 10_000).toISOString(), NOW)).toBe('just now');
  });
  it('uses minutes under an hour', () => {
    expect(formatRelativeDate(new Date(NOW.getTime() - 5 * 60_000).toISOString(), NOW)).toBe('5m ago');
  });
  it('uses hours under a day', () => {
    expect(formatRelativeDate(new Date(NOW.getTime() - 3 * 3600_000).toISOString(), NOW)).toBe('3h ago');
  });
  it('uses days under a month', () => {
    expect(formatRelativeDate(new Date(NOW.getTime() - 10 * 86400_000).toISOString(), NOW)).toBe('10d ago');
  });
  it('falls back to raw string for unparseable input', () => {
    expect(formatRelativeDate('not-a-date', NOW)).toBe('not-a-date');
  });
});

describe('formatShortDate', () => {
  it('formats to "Mon D"', () => {
    // Month names are locale-specific; just assert structure.
    const out = formatShortDate('2026-04-18T00:00:00Z');
    expect(out).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
  });
  it('falls back to raw string when unparseable', () => {
    expect(formatShortDate('nope')).toBe('nope');
  });
});
