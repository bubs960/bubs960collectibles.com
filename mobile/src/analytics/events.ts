// Event names per mobile handoff §12 + web §10 cross-platform names.
// Keep string literals in one place so a typo anywhere fails at compile time.

export interface EventProps {
  figure_viewed: { figure_id: string };
  figure_image_zoomed: { figure_id: string; max_zoom_level: number };
  figure_share_tapped: { figure_id: string; share_destination: string };
  figure_pull_refresh: { figure_id: string; cache_age_seconds: number | null };
  figure_scroll_depth: { figure_id: string; max_depth_pct: 25 | 50 | 75 | 100 };
  figure_ebay_tapped: { figure_id: string };
  figure_own_toggled: { figure_id: string; next_state: boolean };
  figure_want_toggled: { figure_id: string; next_state: boolean };
  auth_required_shown: { figure_id: string; trigger: 'own' | 'want' };
}

export type EventName = keyof EventProps;
