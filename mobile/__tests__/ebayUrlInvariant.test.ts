/**
 * Regression guard for the extension's companion.js affiliate-leak
 * pattern (engineer audit 2026-04-19). Asserts the invariant documented
 * in `src/api/figureApi.ts`: there is exactly one source file that
 * writes an `ebay.com/sch` URL, and it's the affiliate-wrapped builder.
 *
 * If this test fails, someone wrote a raw eBay URL somewhere else in
 * src/ — every click through it is unattributed revenue. Route through
 * buildEbayUrl() instead.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(__dirname, '../src');
const EBAY_PATTERN = /ebay\.com\b/;
const ALLOWLIST = new Set(['api/figureApi.ts']);

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

describe('eBay URL invariant', () => {
  it('only writes ebay.com in the allowlisted affiliate builder', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC_DIR)) {
      const rel = path.relative(SRC_DIR, file).replace(/\\/g, '/');
      if (ALLOWLIST.has(rel)) continue;
      const content = fs.readFileSync(file, 'utf8');
      if (EBAY_PATTERN.test(content)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it('allowlisted builder contains the ebay.com URL + all required affiliate params', () => {
    const file = path.join(SRC_DIR, 'api/figureApi.ts');
    const content = fs.readFileSync(file, 'utf8');
    expect(EBAY_PATTERN.test(content)).toBe(true);
    // US rotator id — never change.
    expect(content).toMatch(/mkrid=711-53200-19255-0/);
    // Mobile-surface EPN segmentation tag. Split across the constant
    // and the URL template, so check the constant directly.
    expect(content).toMatch(/EBAY_CUSTOM_ID\s*=\s*'figurepinner-mobile'/);
    // Live Bubs960 EPN campaign as fallback when env unset.
    expect(content).toMatch(/DEFAULT_EBAY_CAMPAIGN_ID\s*=\s*'5339147406'/);
  });
});
