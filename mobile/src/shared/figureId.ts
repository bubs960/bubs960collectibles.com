// Client-side figure_id synthesizer.
//
// The Worker's public search strips figure_id as an anti-scrape measure
// (mobile/src/js/lib/api.js:56-58 in the Figure Pinner Dev workspace). Mobile
// reconstructs the id from {brand, line, series, name} so it can navigate to
// /figure/:id from a search result.
//
// CRITICAL: this algorithm must produce the same id the KB stores, otherwise
// the detail fetch 404s. The KB ids in the sample data look like:
//   "mattel-elite-11-rey-mysterio"
// which matches slug(brand)-slug(line)-series-slug(name).
//
// This implementation is a best-effort mirror; when the canonical JS version
// in figurepinner-extension/mobile/src/js/lib/api.js is shared, port it
// verbatim and replace this file. Until then, any id mismatch shows up as a
// 404 on figure tap from search — flag that in QA.

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
  // Drop the trailing parenthesised group only if it looks like a line+series
  // tag, not a character variant.
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
