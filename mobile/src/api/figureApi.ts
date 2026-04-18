import type { ApiFigureV1, ApiPriceV1, FigureDetail } from '@/shared/types';

// Cloudflare Worker / Pages Function base. Overridden at build time via
// EXPO_PUBLIC_FIGUREPINNER_API. The web equivalent is NEXT_PUBLIC_API_BASE.
const DEFAULT_BASE = 'https://figurepinner.com';

export interface FigureFetchOptions {
  authToken?: string | null;
  signal?: AbortSignal;
  imageQuality?: 'thumb' | 'full';
}

function apiBase(): string {
  return process.env.EXPO_PUBLIC_FIGUREPINNER_API ?? DEFAULT_BASE;
}

function commonHeaders(opts: FigureFetchOptions): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/json',
    'X-Client': 'figurepinner-mobile/0.1',
  };
  if (opts.authToken) h.Authorization = `Bearer ${opts.authToken}`;
  if (opts.imageQuality) h['X-Image-Quality'] = opts.imageQuality;
  return h;
}

export async function fetchFigure(figureId: string, opts: FigureFetchOptions = {}): Promise<ApiFigureV1> {
  const url = `${apiBase()}/api/v1/figure/${encodeURIComponent(figureId)}`;
  const res = await fetch(url, { headers: commonHeaders(opts), signal: opts.signal });
  if (!res.ok) throw new FigureFetchError(res.status, await res.text().catch(() => ''));
  return (await res.json()) as ApiFigureV1;
}

export async function fetchFigurePrice(
  figureId: string,
  opts: FigureFetchOptions = {},
): Promise<ApiPriceV1 | null> {
  const url = `${apiBase()}/api/v1/figure-price?figureId=${encodeURIComponent(figureId)}`;
  // Price endpoint is best-effort; treat non-200 as "no data" rather than
  // failing the whole screen, matching the web page's behaviour.
  const res = await fetch(url, { headers: commonHeaders(opts), signal: opts.signal }).catch(() => null);
  if (!res || !res.ok) return null;
  return (await res.json()) as ApiPriceV1;
}

/**
 * Fetch the merged figure detail view the mobile UI consumes. Figure metadata
 * is required; pricing + aspirational fields degrade gracefully to null.
 */
export async function fetchFigureDetail(
  figureId: string,
  opts: FigureFetchOptions = {},
): Promise<FigureDetail> {
  const [figure, price] = await Promise.all([
    fetchFigure(figureId, opts),
    fetchFigurePrice(figureId, opts),
  ]);
  return {
    figure,
    price,
    rarity_tier: null,
    line_attributes: null,
    character_notes: null,
    collection: null,
    social: null,
    series_siblings: null,
    character_thread: null,
  };
}

export class FigureFetchError extends Error {
  constructor(public status: number, public body: string) {
    super(`figure fetch failed (${status})`);
    this.name = 'FigureFetchError';
  }
}

// eBay affiliate URL builder. Mirrors figurepinner-site/src/app/figure/[figure_id]/page.tsx.
// Pass EBAY_CAMPAIGN_ID in via EXPO_PUBLIC_EBAY_CAMPAIGN_ID.
export function buildEbayUrl(figure: ApiFigureV1): string {
  const campaignId = process.env.EXPO_PUBLIC_EBAY_CAMPAIGN_ID ?? '';
  const terms = encodeURIComponent(`${figure.brand} ${figure.line} ${figure.series} ${figure.name}`);
  return `https://www.ebay.com/sch/i.html?_nkw=${terms}&_sop=15&mkcid=1&mkrid=711-53200-19255-0&campid=${campaignId}&toolid=10001`;
}
