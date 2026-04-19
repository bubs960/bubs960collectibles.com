// Mirrors the real figurepinner-site API contracts as of this port.
// Source of truth: figurepinner-site/src/app/api/v1/figure/[figure_id]/route.ts
// and the PriceData type in figurepinner-site/src/app/figure/[figure_id]/page.tsx.

/**
 * Worker's resolution status on /api/v1/figure/:id.
 *
 * Per the backend decision doc (docs/v3/FIGURE-ID-MINT-CANONICAL-DECISION-2026-04-19.md §5):
 * the endpoint always returns HTTP 200 — never 404 — with one of:
 *   - 'exact'    → requested id is already the canonical Mint A
 *   - 'moved'    → requested id matched an alias row; figure_id in the
 *                  response is the canonical, cache it
 *   - 'cluster'  → sibling search matched multiple rows; figure_id is
 *                  the best guess — may want to disambiguate later
 *   - 'not_found_but_logged' → no match; request logged to
 *                  figure_id_miss_log for the KB admin review /
 *                  eventual request-to-add flow (v3 mobile)
 *
 * Missing / undefined is treated as 'exact' for backward compat until
 * the alias-patch worker deploy lands (today mobile still hits a bare
 * 404 — client-side soft-recovery in FigureDetailError is the bridge).
 */
export type FigureMatchQuality = 'exact' | 'moved' | 'cluster' | 'not_found_but_logged';

/** GET /api/v1/figure/:figure_id */
export interface ApiFigureV1 {
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
  /** Added by engineer later — optional for now. */
  series_total?: number;
  match_quality?: FigureMatchQuality;
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
 * Merged view used by the mobile UI. Populate from `ApiFigureV1` + `ApiPriceV1`;
 * leave aspirational fields null until the backend supplies them. The null-matrix
 * in FigureDetailScreen is responsible for hiding zones with no signal.
 */
export interface FigureDetail {
  figure: ApiFigureV1;
  price: ApiPriceV1 | null;

  rarity_tier: RarityTier;
  line_attributes: LineAttributes | null;
  character_notes: string | null;
  collection: CollectionState | null;
  social: SocialStats | null;
  series_siblings: SeriesSibling[] | null;
  character_thread: CharacterThreadEntry[] | null;
}
