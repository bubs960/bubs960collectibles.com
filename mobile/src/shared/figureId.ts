// Client-side figure_id synthesizer.
//
// REAL STATE OF THE WORLD (per 2026-04-19 audit):
// There are THREE different figure_id mint patterns live in production:
//
//   1. v2 canonical — Fig Pinner Dev - Claude/API/v1-to-v2-rules.cjs:438
//        fp_{fandom}_{mfr}_{productLine[:24]}_{wave[:16]}_{char[:16]}_{hash6}
//      This is what's stored in figures-reference-v2.js (the KB).
//
//   2. v1 matcher — matcher.js:943
//        {brand}|{line}|{series}|{name}   (pipe-separated)
//      This is what's stored in D1 listings today.
//
//   3. Legacy fp_ — archive migrate_to_d1.js:76
//        fp_{fandom}_{mfr}_{...}   (no hash, no length caps)
//      Still referenced by some old rows.
//
// Because the KB mints (1) and D1 mints (2) for the same figure, tapping a
// search result can silently 404 even when the figure exists under a
// sibling ID with hundreds of listings. This is the KB↔DB vocabulary
// drift — 9/12 Stage-4 "missing" figures exist in DB under sibling IDs
// with 2500+ combined listings.
//
// THE REAL FIX IS NOT IN THIS FILE. Pasting buildFigureId() from
// v1-to-v2-rules.cjs into mobile would just make mobile mint the same
// (sometimes-wrong) ID as the KB. The fix is worker-side:
//
//   - /api/v1/figure/:id returns 404 → fall back to sibling lookup
//     (character_canonical × product_line × release_wave × brand)
//     returning { status: 'moved', canonical_id: '...' }.
//   - Mobile follows the redirect / swaps the id.
//
// Until the worker handles normalization at the /figure/:id boundary,
// mobile's best-effort synthesizer will miss on whatever subset of figures
// drifted in v1→v2. That surfaces as a 404 on FigureDetailError, which
// now offers a "Search for this figure" CTA to soft-recover.
//
// What this file does today:
//   - Produces a reasonable-looking id from search-result fields so
//     navigation has SOMETHING to try. No claim of canonical match.
//
// When the upstream normalization lands:
//   - Delete this file. Mobile search results will carry figure_id directly
//     (authenticated callers already get them via X-FP-Key), and the
//     public projection should stop stripping id per SERVER-ENDPOINTS-NEEDED.md.

export interface FigureIdParts {
  brand: string;
  line: string;
  series: string | number;
  name: string;
  character_variant?: string | null;
}

/**
 * BEST-EFFORT ONLY — see header comment. Intentionally does NOT match any of
 * the three canonical patterns; it just produces a stable slug so the
 * navigate-then-fetch flow has a value to carry. When the fetch 404s,
 * FigureDetailError's "Search for this figure" CTA is the recovery path.
 */
export function buildFigureId(parts: FigureIdParts): string {
  const brand = slugify(parts.brand);
  const line = slugify(parts.line);
  const series = String(parts.series).trim();
  const character = slugify(stripLineSuffix(parts.name));
  return [brand, line, series, character].filter(Boolean).join('-');
}

/**
 * Strip "(Line Series N)" tags from a display name so the character slug
 * doesn't pick them up. Variant tags like "(Masked)" survive.
 *   "Rey Mysterio (Elite Series 11)"         → "Rey Mysterio"
 *   "Rey Mysterio (Masked) (Elite Series 11)" → "Rey Mysterio (Masked)"
 */
function stripLineSuffix(name: string): string {
  return name.replace(/\s*\(([^)]*\s+series\s+\d+[^)]*)\)\s*$/i, '').trim();
}

export function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
