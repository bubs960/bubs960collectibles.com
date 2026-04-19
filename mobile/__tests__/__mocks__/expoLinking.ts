/**
 * Stand-in for expo-linking. linking.ts only uses createURL to build the
 * default figurepinner:// prefix.
 */

export function createURL(path: string): string {
  return `figurepinner://${path.replace(/^\//, '')}`;
}
