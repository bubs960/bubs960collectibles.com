/**
 * Ambient globals Metro injects at build time.
 *
 * __DEV__ is a Metro-provided compile-time constant — `true` for dev bundles,
 * `false` in production. Declared here so TypeScript + ts-jest recognize it
 * without a jest-expo preset in the path (the sandbox harness doesn't load
 * jest-expo).
 */
declare const __DEV__: boolean;
