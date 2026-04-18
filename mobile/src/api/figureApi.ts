import type { FigureDetailResponse } from '@/shared/types';

// Backend is expected to be a Cloudflare Worker / Pages Function. Override
// via app config / EAS env at build time.
const DEFAULT_BASE = 'https://api.figurepinner.com';

export interface FigureFetchOptions {
  useCache?: boolean;
  prefetchRelated?: boolean;
  imageQuality?: 'thumb' | 'full';
  authToken?: string | null;
  signal?: AbortSignal;
}

export async function fetchFigureDetail(
  figureId: string,
  opts: FigureFetchOptions = {},
): Promise<FigureDetailResponse> {
  const base = process.env.EXPO_PUBLIC_FIGUREPINNER_API ?? DEFAULT_BASE;
  const url = `${base}/api/v1/figure/${encodeURIComponent(figureId)}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Client': 'figurepinner-mobile/0.1',
  };
  if (opts.authToken) headers.Authorization = `Bearer ${opts.authToken}`;
  if (opts.imageQuality) headers['X-Image-Quality'] = opts.imageQuality;

  const res = await fetch(url, { headers, signal: opts.signal });
  if (!res.ok) {
    throw new FigureFetchError(res.status, await res.text().catch(() => ''));
  }
  return (await res.json()) as FigureDetailResponse;
}

export class FigureFetchError extends Error {
  constructor(public status: number, public body: string) {
    super(`figure fetch failed (${status})`);
    this.name = 'FigureFetchError';
  }
}
