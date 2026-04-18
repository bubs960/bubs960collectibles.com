// Defensive name cleaner. Not part of the shipped web code today, but specified
// in the mobile handoff (§4) to strip literal "(None)" / "(null)" tokens the
// KB can emit via deriveName when character_variant is the string "None" etc.
//
// For KB-to-display conversion use `deriveName` from './kb'.

const NULLISH_PAREN = /\(\s*(none|null|undefined)\s*\)/gi;
const EMPTY_PAREN = /\(\s*\)/g;
const MULTI_SPACE = /\s+/g;

export function cleanFigureName(
  raw: string | null | undefined,
  fallback?: string,
): string {
  if (!raw || !raw.trim()) {
    return fallback ? prettifySlug(fallback) : '';
  }
  const cleaned = raw
    .replace(NULLISH_PAREN, '')
    .replace(EMPTY_PAREN, '')
    .replace(MULTI_SPACE, ' ')
    .trim();
  return cleaned || (fallback ? prettifySlug(fallback) : '');
}

export function prettifySlug(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
