// Ported verbatim from figurepinner-site/src/data/kb.ts (deriveName + KBFigure).
// When the web canonical changes, update here. These are server-side types on
// the web (never ship to client bundle there), but mobile needs them because
// some endpoints may eventually return raw KB records.

export type KBFigure = {
  figure_id: string;
  v1_figure_id: string;
  fandom: string; // genre slug e.g. "wrestling"
  sub_fandom: string | null;
  character_canonical: string; // e.g. "rey-mysterio"
  character_variant: string | null;
  manufacturer: string; // e.g. "mattel"
  product_line: string; // e.g. "elite"
  release_wave: string; // e.g. "11"
  scale: string | null;
  pack_size: number;
  exclusive_to: string | null;
  canonical_image_url?: string | null;
  name?: string;
};

/**
 * Derive a display name from KB fields when no explicit `name` is present.
 * Mirrors figurepinner-site/src/data/kb.ts → deriveName.
 *   character=rey-mysterio, product_line=elite, release_wave=11
 *   → "Rey Mysterio (Elite Series 11)"
 */
export function deriveName(f: KBFigure): string {
  if (f.name) return f.name;
  const char = titleCaseSlug(f.character_canonical);
  const line = titleCaseSlug(f.product_line);
  const wave = f.release_wave ? ` Series ${f.release_wave}` : '';
  const variant = f.character_variant ? ` (${f.character_variant})` : '';
  return `${char}${variant} (${line}${wave})`;
}

export function titleCaseSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
