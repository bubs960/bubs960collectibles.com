// Mirror of web implementation. If web changes, update here and vice versa.
// Strips literal "(None)", "(null)", empty parens, and collapses whitespace.

const NULLISH_PAREN = /\(\s*(none|null|undefined)\s*\)/gi;
const EMPTY_PAREN = /\(\s*\)/g;
const MULTI_SPACE = /\s+/g;

export function cleanFigureName(raw: string | null | undefined, fallbackSlug?: string): string {
  if (!raw || !raw.trim()) {
    return fallbackSlug ? prettifySlug(fallbackSlug) : '';
  }
  const cleaned = raw
    .replace(NULLISH_PAREN, '')
    .replace(EMPTY_PAREN, '')
    .replace(MULTI_SPACE, ' ')
    .trim();
  return cleaned || (fallbackSlug ? prettifySlug(fallbackSlug) : '');
}

export function prettifySlug(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
