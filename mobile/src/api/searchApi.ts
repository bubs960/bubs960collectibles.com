// Search hits the Cloudflare Worker's public search endpoint.
//
// The public projection intentionally strips figure_id and image_url as an
// anti-scrape "iceberg" pattern — authenticated callers with an X-FP-Key
// header get the full object and a larger result cap. Mobile synthesizes a
// figure_id client-side from the returned {brand, line, series, name} fields
// so it can navigate to /figure/:id from a search result.
//
// Reference: mobile/src/js/lib/api.js in the Figure Pinner Dev workspace.

import { buildFigureId } from '@/shared/figureId';

const DEFAULT_API = 'https://figurepinner-api.bubs960.workers.dev';

function apiBase(): string {
  return process.env.EXPO_PUBLIC_FIGUREPINNER_API ?? DEFAULT_API;
}

/** Raw search result as the Worker returns it (may omit figure_id / image). */
interface RawSearchResult {
  figure_id?: string;
  name: string;
  brand: string;
  line: string;
  series: string;
  genre: string;
  year?: number | null;
  image?: string | null;
}

/** Mobile-consumed result — figure_id is always present after synthesis. */
export interface SearchResult {
  figure_id: string;
  name: string;
  brand: string;
  line: string;
  series: string;
  genre: string;
  year: number | null;
  image: string | null;
}

interface SearchResponse {
  figures: RawSearchResult[];
}

export interface SearchOptions {
  limit?: number;
  signal?: AbortSignal;
  /**
   * Authenticated callers pass an FP key here to get the full projection
   * (figure_id + image + 50-result cap). Public / anonymous callers get the
   * stripped projection with a 10-result cap.
   */
  fpKey?: string | null;
}

/** Server enforces min 2 chars + max limit 20. Short queries short-circuit. */
export async function searchFigures(q: string, opts: SearchOptions = {}): Promise<SearchResult[]> {
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];

  const url = new URL(`${apiBase()}/api/v1/search`);
  url.searchParams.set('q', trimmed);
  url.searchParams.set('limit', String(Math.min(opts.limit ?? 8, 20)));

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Client': 'figurepinner-mobile/0.1',
  };
  if (opts.fpKey) headers['X-FP-Key'] = opts.fpKey;

  const res = await fetch(url.toString(), { headers, signal: opts.signal });
  if (!res.ok) return [];
  const body = (await res.json()) as SearchResponse;
  return (body.figures ?? []).map(adoptResult);
}

function adoptResult(r: RawSearchResult): SearchResult {
  return {
    figure_id:
      r.figure_id ?? buildFigureId({ brand: r.brand, line: r.line, series: r.series, name: r.name }),
    name: r.name,
    brand: r.brand,
    line: r.line,
    series: r.series,
    genre: r.genre,
    year: r.year ?? null,
    image: r.image ?? null,
  };
}
