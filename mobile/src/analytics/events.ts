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
  pro_waitlist_tapped: { figure_id: string };
  app_error: { message: string; component_stack: string };
  /**
   * Emitted when /figure/:id returns anything other than 'direct' —
   * i.e. the worker resolved through alias / cluster / miss layers.
   * Lets us measure KB↔DB drift in the wild.
   *
   * - moved / cluster: canonical_id is the canonical Mint A; the
   *   alias_source + alias_confidence fields describe the match.
   * - not_found_but_logged: canonical_id is null (no figure record).
   */
  figure_id_resolved: {
    requested_id: string;
    canonical_id: string | null;
    match_quality: 'moved' | 'cluster' | 'not_found_but_logged';
    alias_source?: string | null;
    alias_confidence?: number | null;
  };
}

export type EventName = keyof EventProps;
