/**
 * @file search.ts
 * @description Búsqueda de información para el asistente (brief, sección 7.2).
 * v1: API pública de Wikipedia en español. La interfaz SearchProvider permite
 * agregar OpenAlex en v2 sin tocar el asistente.
 */

import { WIKIPEDIA } from '@shared/config';

export interface SearchResult {
  title: string;
  extract: string;
  /** Nombre de la fuente para mostrar como texto (sin enlaces). */
  sourceLabel: string;
}

export interface SearchProvider {
  readonly name: string;
  search(query: string): Promise<SearchResult[]>;
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/** Extrae los ids de página de la respuesta de `list=search`. */
export function parseSearchResponse(json: unknown): { pageid: number; title: string }[] {
  const results = (json as { query?: { search?: { pageid?: unknown; title?: unknown }[] } })?.query?.search;
  if (!Array.isArray(results)) return [];
  return results
    .filter(r => typeof r.pageid === 'number' && typeof r.title === 'string')
    .map(r => ({ pageid: r.pageid as number, title: r.title as string }));
}

/** Extrae los textos de introducción de `prop=extracts`, en el orden de `pageIds`. */
export function parseExtractsResponse(json: unknown, pageIds: number[]): SearchResult[] {
  const pages = (json as { query?: { pages?: Record<string, { title?: unknown; extract?: unknown }> } })?.query?.pages;
  if (!pages) return [];
  return pageIds
    .map(id => pages[String(id)])
    .filter(p => p && typeof p.title === 'string' && typeof p.extract === 'string' && p.extract.trim().length > 0)
    .map(p => ({
      title: p.title as string,
      extract: (p.extract as string).trim(),
      sourceLabel: 'Wikipedia en español (CC BY-SA)',
    }));
}

export class WikipediaSearchProvider implements SearchProvider {
  readonly name = 'Wikipedia';

  constructor(private readonly fetchImpl: Fetch = (url, init) => fetch(url, init)) {}

  private async get(params: Record<string, string>): Promise<unknown> {
    const url = new URL(WIKIPEDIA.apiUrl);
    Object.entries({ ...params, format: 'json', origin: '*' }).forEach(([k, v]) => url.searchParams.set(k, v));
    const response = await this.fetchImpl(url.toString(), { headers: { 'Api-User-Agent': WIKIPEDIA.userAgent } });
    if (!response.ok) throw new Error(`Wikipedia respondió ${response.status}`);
    return response.json();
  }

  async search(query: string): Promise<SearchResult[]> {
    const q = query.trim().slice(0, 300);
    if (!q) return [];
    const hits = parseSearchResponse(
      await this.get({ action: 'query', list: 'search', srsearch: q, srlimit: String(WIKIPEDIA.maxResults) })
    );
    if (hits.length === 0) return [];
    const ids = hits.map(h => h.pageid);
    const extracts = await this.get({
      action: 'query',
      prop: 'extracts',
      exintro: '1',
      explaintext: '1',
      pageids: ids.join('|'),
    });
    return parseExtractsResponse(extracts, ids);
  }
}

/** Proveedor en uso (v1). */
export const searchProvider: SearchProvider = new WikipediaSearchProvider();
