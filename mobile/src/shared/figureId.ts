// Client-side figure_id synthesizer.
//
// Why this exists: the Worker's public search projection strips figure_id as
// an anti-scrape pattern, so mobile reconstructs the id from the visible
// {brand, line, series, name} fields to navigate to /figure/:id (or
// /open/:id) from a search result.
//
// CRITICAL — this is a guess until the canonical mint is shared.
// The mint logic is NOT in figurepinner-site. Confirmed by audit:
//   - figurepinner-site/src/data/kb.ts:3-5 says
//       "figures-reference-v2.js is the source of truth — committed to this
//        repo, updated by running:
//          cp <extension-repo>/API/figures-reference-v2.js src/data/"
//   - The whole figurepinner-site codebase READS figure_id; nothing constructs it.
//   - The KBFigure type carries both figure_id AND v1_figure_id, which means
//     the mint algorithm CHANGED at some point. If the v2 algorithm differs
//     from what mobile guesses here, the mismatch is silent: search shows
//     results, taps 404. Worth checking the upstream mint script and the
//     v1→v2 diff before TestFlight.
//
// What to do to make this canonical:
//   1. Find the script in the extension repo (Fig Pinner Dev workspace) that
//      generates API/figures-reference-v2.js. Look for whatever assembles a
//      figure_id from the {manufacturer, product_line, release_wave,
//      character_canonical, character_variant?} natural key.
//   2. Port that function verbatim into this file, replacing buildFigureId.
//   3. Add a sanity test that asserts a few real figure_id values from the
//      committed KB match the function's output.
//
// Working hypothesis (matches the sample id 'mattel-elite-11-rey-mysterio'):
//   slug(manufacturer) + '-' + slug(product_line) + '-' + release_wave
//   + '-' + slug(character_canonical)
//   + (character_variant ? '-' + slug(character_variant) : '')
// Mobile receives display strings ({brand, line, series, name}) not the raw
// natural key, so it has to re-slug + try to strip "(Line Series N)" suffixes
// from the display name. That's another point of drift risk.

export interface FigureIdParts {
  brand: string;
  line: string;
  series: string | number;
  name: string;
  character_variant?: string | null;
}

export function buildFigureId(parts: FigureIdParts): string {
  const brand = slugify(parts.brand);
  const line = slugify(parts.line);
  const series = String(parts.series).trim();
  const character = slugify(stripLineSuffix(parts.name));
  return [brand, line, series, character].filter(Boolean).join('-');
}

/**
 * Strip "(Line Series N)" or "(Variant)" suffixes from a display name so the
 * character slug doesn't pick them up. Matches deriveName's reverse.
 *   "Rey Mysterio (Elite Series 11)" → "Rey Mysterio"
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
