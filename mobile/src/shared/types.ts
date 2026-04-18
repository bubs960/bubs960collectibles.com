// TODO: source of truth lives in figurepinner-dev. Keep this aligned with the
// server's FigureDetailResponse; if mobile diverges, it's a bug.

export type RarityTier = 'common' | 'uncommon' | 'rare' | 'grail' | null;

export interface LineAttributes {
  line_name: string | null;
  era: string | null;
  years: { start: number | null; end: number | null } | null;
}

export interface PricingComp {
  id: string;
  title: string;
  sub: string | null;
  condition: string | null;
  price_cents: number;
  sold_at: string;
  image_url: string | null;
  listing_url: string;
}

export interface PricingSeriesPoint {
  t: string;
  price_cents: number;
}

export interface Pricing {
  median_cents: number | null;
  low_cents: number | null;
  high_cents: number | null;
  sold_count_90d: number | null;
  trend_pct_90d: number | null;
  series: PricingSeriesPoint[];
  recent_comps: PricingComp[];
}

export interface SeriesCompletion {
  owned: number;
  total: number;
}

export interface CollectionState {
  owned: boolean;
  wanted: boolean;
  series_completion: SeriesCompletion | null;
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

export interface FigureDetailResponse {
  figure_id: string;
  slug: string;
  name: string | null;
  character_slug: string | null;
  brand: string | null;
  series: string | null;
  release_year: number | null;
  rarity_tier: RarityTier;
  image_url: string | null;
  line_attributes: LineAttributes | null;
  character_notes: string | null;
  pricing: Pricing | null;
  collection: CollectionState | null;
  social: SocialStats | null;
  series_siblings: SeriesSibling[] | null;
  character_thread: CharacterThreadEntry[] | null;
}
