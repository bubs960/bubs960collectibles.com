/**
 * Tiny RFC 4122 v4 uuid generator used for analytics event uids.
 *
 * The uid is the server's primary-key dedup mechanism (POST
 * /api/v1/analytics/event accepts {events: [{uid, ...}]} and silently
 * de-dupes by uid). Drop-on-failure semantics mean the wrapper never
 * actually retries, but the uid keeps the contract honest if a future
 * retry policy lands without breaking the server-side dedup.
 *
 * Uses globalThis.crypto.getRandomValues when available (Hermes /
 * Expo SDK 51 / Node 20 web crypto), falls back to Math.random for
 * test environments. Math.random is NOT cryptographically secure but
 * collision odds at our scale (a few k events / day) are negligible.
 */
export function uuidv4(): string {
  const bytes = new Uint8Array(16);
  const cryptoObj: Crypto | undefined =
    typeof globalThis !== 'undefined' && 'crypto' in globalThis
      ? (globalThis as { crypto?: Crypto }).crypto
      : undefined;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  // Per RFC 4122 §4.4: set the version (0100) and variant (10) bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex: string[] = [];
  for (let i = 0; i < 16; i++) hex.push(bytes[i].toString(16).padStart(2, '0'));
  return (
    `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-` +
    `${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
  );
}
