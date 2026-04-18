// Collection mutations.
//
// Auth endpoints live on the Cloudflare Worker (figurepinner-api.bubs960.workers.dev),
// NOT on the Next marketing site. Today the reference mobile client (Figure
// Pinner Dev workspace) is localStorage-only per docs/SERVER-ENDPOINTS-NEEDED.md;
// these routes are planned, not yet shipped. When they land, the Worker is
// expected to verify the Clerk session JWT via JWKS directly — no Next
// middleware in the path.
//
// Paths per specs/screen-02-wantlist.html:1281 and specs/screen-03-vault.html:1186:
//   POST   /api/v1/wantlist
//   DELETE /api/v1/wantlist/item/:id    (soft delete → status='removed')
//   POST   /api/v1/vault
//   DELETE /api/v1/vault/items/:id      (soft delete → status='removed')
//
// The path-segment inconsistency (item vs. items) matches the specs verbatim;
// if the Worker implementation normalizes that, swap the constants below.

import type { ApiFigureV1 } from '@/shared/types';

const DEFAULT_API = 'https://figurepinner-api.bubs960.workers.dev';

function apiBase(): string {
  return process.env.EXPO_PUBLIC_FIGUREPINNER_API ?? DEFAULT_API;
}

export class CollectionApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`collection api error (${status})`);
    this.name = 'CollectionApiError';
  }
}

export interface AddVaultOptions {
  paid?: number;
  condition?: string;
}

export interface AddWantlistOptions {
  target_price?: number;
}

/** POST /api/v1/vault — mark as owned. Returns the server-assigned item id. */
export async function addToVault(
  figure: ApiFigureV1,
  token: string,
  opts: AddVaultOptions = {},
): Promise<{ id: string }> {
  return postJson(`${apiBase()}/api/v1/vault`, token, {
    figure_id: figure.figure_id,
    name: figure.name,
    brand: figure.brand,
    line: figure.line,
    genre: figure.genre,
    paid: opts.paid ?? 0,
    condition: opts.condition ?? 'Loose',
  });
}

/** POST /api/v1/wantlist — mark as wanted. */
export async function addToWantlist(
  figure: ApiFigureV1,
  token: string,
  opts: AddWantlistOptions = {},
): Promise<{ id: string }> {
  return postJson(`${apiBase()}/api/v1/wantlist`, token, {
    figure_id: figure.figure_id,
    name: figure.name,
    brand: figure.brand,
    line: figure.line,
    genre: figure.genre,
    target_price: opts.target_price ?? 0,
  });
}

/**
 * DELETE /api/v1/vault/items/:id — soft delete. Server preserves the row
 * with status='removed' so we can support "recently removed" UX and keep
 * delete→re-add analytics intact. Do NOT treat a 200 here as hard-delete.
 */
export async function deleteVaultItem(itemId: string, token: string): Promise<void> {
  await del(`${apiBase()}/api/v1/vault/items/${encodeURIComponent(itemId)}`, token);
}

/** DELETE /api/v1/wantlist/item/:id — same soft-delete semantics. */
export async function deleteWantlistItem(itemId: string, token: string): Promise<void> {
  await del(`${apiBase()}/api/v1/wantlist/item/${encodeURIComponent(itemId)}`, token);
}

async function postJson(url: string, token: string, body: unknown): Promise<{ id: string }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Client': 'figurepinner-mobile/0.1',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new CollectionApiError(res.status, await res.text().catch(() => ''));
  return (await res.json()) as { id: string };
}

async function del(url: string, token: string): Promise<void> {
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Client': 'figurepinner-mobile/0.1',
    },
  });
  if (!res.ok) throw new CollectionApiError(res.status, await res.text().catch(() => ''));
}
