/**
 * Canonical alias pair used by backend + mobile smoke tests when the
 * worker alias patch deploys (engineer handoff 2026-04-19).
 *
 * Scenario: mobile requests the KB canonical id (0 listings in D1);
 * worker alias layer resolves to the sibling id that actually holds
 * the listings; mobile re-renders against the canonical id with real
 * data. Quality should come back as 'moved'.
 *
 * When running the smoke test on a device, navigate to
 *   figurepinner://open/fp_wrestling_mattel_elite_hall-of-fame_ultimate-warrior_a7c1e9
 * and verify:
 *   - figure_viewed analytics fires with the canonical id
 *     (fp_wrestling_mattel_elite_hall-of-fame_ultimate-warrior_a7c1e9)
 *   - figure_id_resolved fires with:
 *       { requested_id, canonical_id, match_quality: 'moved' }
 *   - Market panel shows real Elite Series 26 Hall of Fame 2014 listings
 *     (not "No recent sales")
 *   - The route param silently swaps to the canonical id so a
 *     back-gesture + re-link doesn't re-resolve through the alias layer.
 */

export const ULTIMATE_WARRIOR_ALIAS_FIXTURE = {
  /** KB canonical mint (Mint A). 0 listings in D1 today. */
  kbCanonical: 'fp_wrestling_mattel_elite_hall-of-fame_ultimate-warrior_a7c1e9',
  /** DB sibling that actually holds the Hall of Fame 2014 release. */
  dbSibling: 'fp_wrestling_mattel_elite_26_ultimate-warrior_fae3eb',
  /** Expected match_quality when querying `kbCanonical` after the alias patch. */
  expectedMatchQuality: 'moved' as const,
};
