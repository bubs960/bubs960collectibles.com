/**
 * Canonical alias pair used by backend + mobile smoke tests after the
 * 2026-04-25 worker alias-aware deploy ("update big" engineer note).
 *
 * The original Ultimate Warrior pair (kb_canonical=hall-of-fame /
 * db_sibling=elite_26) is OBSOLETE post Tier-5 ship — the engineer's
 * note explicitly flagged the direction was reversed in the earlier
 * fixture and that the pair is no longer the right canary. The Miz pair
 * below is the engineer-recommended replacement: a real moved-quality
 * resolution that works against the live worker today.
 *
 * Scenario: mobile requests an alias id; worker alias layer resolves to
 * the canonical Mint A id; mobile re-renders against the canonical id
 * with real data. Quality should come back as 'moved'.
 *
 * Two scenarios are kept here so smoke tests can rehearse the
 * happy-path and the alias-resolution path without a backend toggle:
 *   - direct: a canonical id that already lives in D1 → 'direct'
 *   - moved:  an alias id that resolves to the canonical → 'moved'
 *
 * When running the smoke test on a device, navigate to
 *   figurepinner://open/{ALIAS_FIXTURE.moved.requestedId}
 * and verify:
 *   - figure_viewed analytics fires with the canonical id
 *   - figure_id_resolved fires with:
 *       { requested_id, canonical_id, match_quality: 'moved',
 *         alias_source, alias_confidence }
 *   - Market panel shows real listings (not "No recent sales")
 *   - The route param silently swaps to the canonical id so a
 *     back-gesture + re-link doesn't re-resolve through the alias layer.
 */

/**
 * Direct hit: the canonical Mint A id is already in D1 with listings.
 * Worker should return match_quality='direct' and the same id we asked
 * for.
 */
export const THE_MIZ_DIRECT_FIXTURE = {
  canonical: 'fp_wrestling_mattel_elite_3_the-miz_7770c5',
  expectedMatchQuality: 'direct' as const,
};

/**
 * Moved: a sibling alias resolves through figure_id_alias to the
 * canonical above. Mobile asked for the alias; worker swapped in the
 * canonical id and flagged the resolution.
 */
export const THE_MIZ_ALIAS_FIXTURE = {
  /** Alias id mobile sends (the older "miz" variant). */
  alias: 'fp_wrestling_mattel_elite_3_miz_5d087e',
  /** Canonical Mint A the alias layer resolves to. */
  canonical: 'fp_wrestling_mattel_elite_3_the-miz_7770c5',
  /** Expected match_quality when querying the alias post 2026-04-25. */
  expectedMatchQuality: 'moved' as const,
  /** What the worker reports as the resolution source. */
  expectedAliasSource: 'figure_id_alias' as const,
};
