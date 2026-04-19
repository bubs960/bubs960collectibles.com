import { CollectionApiError } from '@/api/collectionApi';
import type { GetTokenOptions } from './useAuthToken';

/**
 * Run an authed operation with a one-retry-on-401 fallback per engineer Q4
 * (2026-04-19): "Refresh Clerk token and retry once; second failure →
 * surface to user."
 *
 * Usage:
 *   await withAuthRetry(getToken, async (tok) => addToVault(fig, tok));
 *
 * `getToken` is the tokenizer returned by useAuthToken — on the retry
 * path we call it with { forceRefresh: true } so Clerk bypasses its
 * in-memory cache and fetches a fresh JWT. Any error OTHER than a
 * CollectionApiError 401 propagates without retry.
 */
export async function withAuthRetry<T>(
  getToken: (opts?: GetTokenOptions) => Promise<string | null>,
  operation: (token: string) => Promise<T>,
): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error('not signed in');
  try {
    return await operation(token);
  } catch (err) {
    if (!(err instanceof CollectionApiError) || err.status !== 401) throw err;
    const fresh = await getToken({ forceRefresh: true });
    if (!fresh) throw err;
    return operation(fresh);
  }
}
