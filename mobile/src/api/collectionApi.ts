// Collection mutation client. Mirrors figurepinner-site/src/app/api/vault/route.ts
// and figurepinner-site/src/app/api/wantlist/route.ts. Authenticated via Clerk
// Bearer token (`Authorization: Bearer <session_jwt>`).

import type { ApiFigureV1 } from '@/shared/types';

// Same Worker as figureApi.ts — NOT the marketing site at figurepinner.com.
const DEFAULT_BASE = 'https://figurepinner-api.bubs960.workers.dev';

function apiBase(): string {
  return process.env.EXPO_PUBLIC_FIGUREPINNER_API ?? DEFAULT_BASE;
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

/** POST /api/vault — mark as owned. */
export async function addToVault(
  figure: ApiFigureV1,
  token: string,
  opts: AddVaultOptions = {},
): Promise<{ id: string }> {
  return postJson(`${apiBase()}/api/vault`, token, {
    figure_id: figure.figure_id,
    name: figure.name,
    brand: figure.brand,
    line: figure.line,
    genre: figure.genre,
    paid: opts.paid ?? 0,
    condition: opts.condition ?? 'Loose',
  });
}

/** POST /api/wantlist — mark as wanted. */
export async function addToWantlist(
  figure: ApiFigureV1,
  token: string,
  opts: AddWantlistOptions = {},
): Promise<{ id: string }> {
  return postJson(`${apiBase()}/api/wantlist`, token, {
    figure_id: figure.figure_id,
    name: figure.name,
    brand: figure.brand,
    line: figure.line,
    genre: figure.genre,
    target_price: opts.target_price ?? 0,
  });
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
