// Search hits the Next site's /api/v1/search (NOT the workers.dev API), because
// the Worker's public search intentionally omits figure_id + image as an
// anti-scraping "iceberg" pattern. See figurepinner-site/src/app/api/v1/search/route.ts.

const DEFAULT_SITE = 'https://figurepinner.com';

function siteBase(): string {
  return process.env.EXPO_PUBLIC_FIGUREPINNER_SITE ?? DEFAULT_SITE;
}

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

export interface SearchResponse {
  figures: SearchResult[];
}

export interface SearchOptions {
  limit?: number;
  signal?: AbortSignal;
}

/** Server enforces min 2 chars + max limit 20. Short queries short-circuit here. */
export async function searchFigures(q: string, opts: SearchOptions = {}): Promise<SearchResult[]> {
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];
  const url = new URL(`${siteBase()}/api/v1/search`);
  url.searchParams.set('q', trimmed);
  url.searchParams.set('limit', String(Math.min(opts.limit ?? 8, 20)));

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'X-Client': 'figurepinner-mobile/0.1',
    },
    signal: opts.signal,
  });
  if (!res.ok) return [];
  const body = (await res.json()) as SearchResponse;
  return body.figures ?? [];
}
