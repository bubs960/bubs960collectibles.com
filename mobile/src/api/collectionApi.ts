// Collection mutation client. Mirrors figurepinner-site/src/app/api/vault/route.ts
// and figurepinner-site/src/app/api/wantlist/route.ts. Authenticated via Clerk
// Bearer token (`Authorization: Bearer <session_jwt>`).

import type { ApiFigureV1 } from '@/shared/types';

// Collection endpoints live on the Next site (figurepinner.com), NOT the
// workers.dev API — they require @clerk/nextjs/server auth() which depends on
// the Next server context. Override via EXPO_PUBLIC_FIGUREPINNER_SITE.
const DEFAULT_SITE = 'https://figurepinner.com';

function siteBase(): string {
  return process.env.EXPO_PUBLIC_FIGUREPINNER_SITE ?? DEFAULT_SITE;
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
  return postJson(`${siteBase()}/api/vault`, token, {
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
  return postJson(`${siteBase()}/api/wantlist`, token, {
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
