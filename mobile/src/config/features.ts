/**
 * Build-time feature flags.
 *
 * v1 ships with everything false — a read-only browser. v2 unlocks the
 * collection + alerts surfaces once the Worker exposes the matching
 * endpoints (POST/DELETE /api/v1/vault + /api/v1/wantlist, GET variants,
 * POST /api/v1/devices for push registration).
 *
 * Flip via EAS Build profiles — set EXPO_PUBLIC_V2_* env vars on the
 * profile to publish a v2 binary without merging a branch:
 *
 *   eas.json:
 *     "build": {
 *       "v2-preview": {
 *         "env": {
 *           "EXPO_PUBLIC_V2_COLLECTION_SYNC": "true",
 *           "EXPO_PUBLIC_V2_ALERTS": "true"
 *         }
 *       }
 *     }
 *
 * Treat flags as read-once-at-module-load. Do NOT check them in hot paths
 * or inside hook calls — build-time constants let the bundler dead-code
 * eliminate the disabled branch, and they need to be stable for React's
 * Rules of Hooks.
 */

function env(name: string): boolean {
  return process.env[name] === 'true';
}

export const FEATURES = {
  /**
   * Clerk auth + Vault/Wantlist + local-to-server collection sync.
   * Pulls Own/Want into the sticky bar, re-adds vault/wantlist screens,
   * wraps the tree in ClerkProvider, and mounts the pull-sync driver.
   */
  collectionSync: env('EXPO_PUBLIC_V2_COLLECTION_SYNC'),

  /**
   * Price-drop alerts UI + expo-notifications permission flow + Expo push
   * token registration. Depends on the Worker accepting per-device
   * registrations (`POST /api/v1/devices`) which doesn't exist yet.
   * Usually implies collectionSync=true since alerts fire on wantlist
   * items.
   */
  alerts: env('EXPO_PUBLIC_V2_ALERTS'),
} as const;

export type FeatureName = keyof typeof FEATURES;
