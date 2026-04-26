// Mirrors the real figurepinner-site API contracts as of this port.
// Source of truth: figurepinner-site/src/app/api/v1/figure/[figure_id]/route.ts
// and the PriceData type in figurepinner-site/src/app/figure/[figure_id]/page.tsx.

/**
 * Worker's resolution status on /api/v1/figure/:id.
 *
 * Per the alias-aware response shapes confirmed live in production
 * 2026-04-25:
 *   - 'direct'    → requested id is already the canonical Mint A.
 *                   Response carries the full figure record.
 *   - 'moved'     → requested id matched an alias row; the response's
 *                   `figure_id` is the canonical to re-key on, and
 *                   `original_figure_id` echoes what mobile asked for.
 *                   `alias_source` + `alias_confidence` describe the
 *                   match for analytics.
 *   - 'cluster'   → sibling search matched multiple rows; figure_id
 *                   is the best guess. Tier-2 — not yet shipped.
 *   - 'not_found_but_logged' → no match; request logged to
 *                   figure_id_miss_log. Response carries ONLY
 *                   { match_quality, original_figure_id,
 *                     figure_id: null, canonical_image_url: null } —
 *                   no name / brand / line / etc.
 *
 * Missing / undefined match_quality is treated as 'direct' for
 * backward compat with any pre-alias-patch responses still floating
 * through caches.
 */
export type FigureMatchQuality = 'direct' | 'moved' | 'cluster' | 'not_found_but_logged';

/**
 * Hit response — carries a real canonical figure record.
 * Covers 'direct', 'moved', and (eventually) 'cluster'.
 */
export interface ApiFigureHit {
  figure_id: string;
  name: string;
  brand: string;
  line: string;
  series: string;
  genre: string;
  year: number | null;
  canonical_image_url: string | null;
  exclusive_to: string | null;
  pack_size: number;
  scale: string | null;
  series_total?: number;
  match_quality?: 'direct' | 'moved' | 'cluster';
  /** Echo of what mobile sent — present on 'moved' / 'cluster'. */
  original_figure_id?: string;
  /** Where the alias resolved from (e.g. 'figure_id_alias', 'sibling_search'). */
  alias_source?: string;
  /** 0-1 confidence for cluster matches. */
  alias_confidence?: number;
}

/**
 * Miss response — the alias layer logged the request but found nothing.
 * Response carries `original_figure_id` + nulled-out content fields.
 * `name`, `brand`, etc. are simply absent. UI must branch on this
 * variant before reading any content.
 */
export interface ApiFigureMiss {
  match_quality: 'not_found_but_logged';
  figure_id: null;
  original_figure_id: string;
  canonical_image_url: null;
}

/** GET /api/v1/figure/:figure_id — alias-aware union. */
export type ApiFigureResponse = ApiFigureHit | ApiFigureMiss;

/**
 * Legacy alias retained so existing imports keep type-checking. New
 * call sites should use `ApiFigureHit` (hit-only) or `ApiFigureResponse`
 * (full union) explicitly.
 */
export type ApiFigureV1 = ApiFigureHit;

/** Type guard so the screen can narrow safely. */
export function isFigureMiss(r: ApiFigureResponse): r is ApiFigureMiss {
  return r.match_quality === 'not_found_but_logged';
}

export interface ApiSoldComp {
  price: number;
  title: string;
  condition: string;
  sold_date: string;
  listing_format: string;
}

/** GET /api/v1/figure-price?figureId=... */
export interface ApiPriceV1 {
  figureId: string;
  avgSold: number | null;
  medianSold?: number | null;
  minSold?: number | null;
  maxSold?: number | null;
  soldCount: number;
  avgFS: number | null;
  fsCount: number;
  minFS: number | null;
  soldHistory: ApiSoldComp[];
}

// ── Aspirational fields from the mobile design handoff ──
// These fields do not exist in the API today. When they land (per the spec's
// "content files land near launch" note), populate and remove the `| null`
// defaults in the adapter.
export type RarityTier = 'common' | 'uncommon' | 'rare' | 'grail' | null;

export interface LineAttributes {
  line_name: string | null;
  era: string | null;
  years: { start: number | null; end: number | null } | null;
}

export interface CollectionState {
  owned: boolean;
  wanted: boolean;
  series_completion: { owned: number; total: number } | null;
}

export interface SocialStats {
  pin_count: number;
  view_count_30d: number;
}

export interface SeriesSibling {
  figure_id: string;
  name: string;
  image_url: string | null;
  owned: boolean;
  viewing: boolean;
}

export interface CharacterThreadEntry {
  figure_id: string;
  year: number | null;
  line_name: string;
  image_url: string | null;
}

/**
 * Merged view used by the mobile UI. Discriminated union mirroring the
 * Worker's alias-aware response: a `hit` carries the full figure +
 * pricing + aspirational fields, a `miss` carries just the original id
 * the user requested (so the screen can render "we don't have this yet —
 * your query was logged").
 *
 * Always check `match_quality === 'not_found_but_logged'` (or use the
 * isFigureDetailMiss helper) BEFORE reading `data.figure` — TypeScript
 * narrows correctly so the read is safe inside the hit branch.
 */
export interface FigureDetailHit {
  match_quality: 'direct' | 'moved' | 'cluster';
  figure: ApiFigureHit;
  price: ApiPriceV1 | null;

  rarity_tier: RarityTier;
  line_attributes: LineAttributes | null;
  character_notes: string | null;
  collection: CollectionState | null;
  social: SocialStats | null;
  series_siblings: SeriesSibling[] | null;
  character_thread: CharacterThreadEntry[] | null;
}

export interface FigureDetailMiss {
  match_quality: 'not_found_but_logged';
  /** What the user / route requested — the only id we have for this view. */
  original_figure_id: string;
}

export type FigureDetail = FigureDetailHit | FigureDetailMiss;

export function isFigureDetailMiss(d: FigureDetail): d is FigureDetailMiss {
  return d.match_quality === 'not_found_but_logged';
}
