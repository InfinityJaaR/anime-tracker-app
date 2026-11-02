/**
 * Cliente del catálogo de anime con Tenrai API (https://tenrai.org), que sustituye
 * a la API pública de Jikan (descontinuada). Tenrai mantiene el esquema de Jikan v4,
 * por eso el archivo y los tipos conservan el nombre `Jikan*`.
 * No requiere autenticación. Los IDs coinciden con los de MyAnimeList.
 * Límites: 4 peticiones/s y 120/min por IP; en 429 se espera `Retry-After`.
 *
 * Hay reintentos con backoff ante 429/5xx. Para búsqueda/detalle también hay
 * fallback a MAL (ver lib/api/catalog.ts).
 */

const CATALOG_API = 'https://api.tenrai.org/v1';
const ERROR_PREFIX = 'Tenrai';
const RETRYABLE = new Set([429, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
/** Sin límite, una petición colgada impide que se ejecute el fallback a MAL. */
const REQUEST_TIMEOUT_MS = 8000;

class JikanTimeoutError extends Error {
  constructor() {
    super(`${ERROR_PREFIX}: tiempo de espera agotado`);
  }
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new JikanTimeoutError();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export interface JikanImage {
  image_url: string;
  small_image_url?: string;
  large_image_url?: string;
}

export interface JikanNamedResource {
  mal_id: number;
  type: string;
  name: string;
  url: string;
}

export interface JikanAnime {
  mal_id: number;
  url: string;
  images: { jpg: JikanImage; webp?: JikanImage };
  trailer?: { youtube_id?: string; url?: string; images?: { maximum_image_url?: string; large_image_url?: string } };
  title: string;
  title_english?: string | null;
  title_japanese?: string | null;
  title_synonyms?: string[];
  type?: string | null;
  source?: string | null;
  episodes?: number | null;
  status?: string | null;
  airing?: boolean;
  aired?: { from?: string | null; to?: string | null; string?: string };
  duration?: string | null;
  rating?: string | null;
  score?: number | null;
  scored_by?: number | null;
  rank?: number | null;
  popularity?: number | null;
  members?: number | null;
  favorites?: number | null;
  synopsis?: string | null;
  season?: string | null;
  year?: number | null;
  broadcast?: { day?: string | null; time?: string | null; timezone?: string | null; string?: string | null };
  studios?: JikanNamedResource[];
  genres?: JikanNamedResource[];
  themes?: JikanNamedResource[];
  demographics?: JikanNamedResource[];
}

export interface JikanCharacterEntry {
  character: {
    mal_id: number;
    url: string;
    images: { jpg: JikanImage; webp?: JikanImage };
    name: string;
  };
  role: string;
}

export interface JikanPagination {
  last_visible_page: number;
  has_next_page: boolean;
  current_page: number;
  items: { count: number; total: number; per_page: number };
}

export interface JikanPage<T> {
  data: T[];
  pagination: JikanPagination;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function jikanFetch<T>(path: string): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetchWithTimeout(`${CATALOG_API}${path}`);
      if (response.ok) {
        return (await response.json()) as T;
      }

      const body = await response.text().catch(() => '');
      let message = body;
      try {
        const parsed = JSON.parse(body) as { message?: string };
        if (parsed.message) message = parsed.message;
      } catch {
        // cuerpo no JSON
      }

      const error = new Error(`${ERROR_PREFIX} ${response.status}: ${message || response.statusText}`);
      lastError = error;

      if (!RETRYABLE.has(response.status) || attempt === MAX_ATTEMPTS) {
        throw error;
      }
      // Backoff: 600ms, 1200ms…; en 429 se respeta Retry-After (acotado a 5 s).
      const retryAfter = Number(response.headers.get('Retry-After'));
      await sleep(
        response.status === 429 && retryAfter > 0
          ? Math.min(retryAfter, 5) * 1000
          : 600 * attempt,
      );
    } catch (error) {
      // Un timeout no se reintenta: así el fallback a MAL entra en pocos segundos.
      if (error instanceof JikanTimeoutError) throw error;
      if (error instanceof Error && error.message.startsWith(`${ERROR_PREFIX} `)) {
        if (attempt === MAX_ATTEMPTS) throw error;
        lastError = error;
        await sleep(600 * attempt);
        continue;
      }
      // Error de red
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === MAX_ATTEMPTS) throw lastError;
      await sleep(600 * attempt);
    }
  }

  throw lastError ?? new Error(`${ERROR_PREFIX}: error desconocido`);
}

/** Búsqueda de anime por texto. */
export function searchAnime(query: string, page = 1): Promise<JikanPage<JikanAnime>> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    limit: '20',
    order_by: 'members',
    sort: 'desc',
  });
  return jikanFetch(`/anime?${params.toString()}`);
}

/** Detalle completo de un anime. */
export async function getAnimeFull(malId: number): Promise<JikanAnime> {
  const result = await jikanFetch<{ data: JikanAnime }>(`/anime/${malId}/full`);
  return result.data;
}

/** Personajes de un anime. */
export async function getAnimeCharacters(malId: number): Promise<JikanCharacterEntry[]> {
  const result = await jikanFetch<{ data: JikanCharacterEntry[] }>(`/anime/${malId}/characters`);
  return result.data;
}

/** Animes de la temporada en emisión, de 100 en 100 (tope de seguridad de 4 páginas). */
export async function getSeasonNow(): Promise<JikanAnime[]> {
  const all: JikanAnime[] = [];
  for (let page = 1; page <= 4; page++) {
    const result = await jikanFetch<JikanPage<JikanAnime>>(
      `/seasons/now?limit=100&sfw=true&page=${page}`,
    );
    all.push(...result.data);
    if (!result.pagination?.has_next_page) break;
  }
  return all;
}

export interface AdvancedFilters {
  /** tv | movie | special (valores de MAL en minúsculas). */
  type: string | null;
  minScore: number | null;
  /** IDs de géneros de MAL. */
  genres: number[];
  /** Año de inicio mínimo: devuelve animes emitidos desde ese año. */
  fromYear: number | null;
}

/** Búsqueda por filtros (sin texto), ordenada por puntuación. */
export function searchAnimeFiltered(
  filters: AdvancedFilters,
  page: number,
): Promise<JikanPage<JikanAnime>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: '25',
    order_by: 'score',
    sort: 'desc',
    sfw: 'true',
  });
  if (filters.type) params.set('type', filters.type);
  if (filters.minScore) params.set('min_score', String(filters.minScore));
  if (filters.genres.length) params.set('genres', filters.genres.join(','));
  if (filters.fromYear) params.set('start_date', `${filters.fromYear}-01-01`);
  return jikanFetch(`/anime?${params.toString()}`);
}

/** Animes de una temporada, paginado. */
export function getSeasonPage(
  year: number,
  season: string,
  page: number,
): Promise<JikanPage<JikanAnime>> {
  const params = new URLSearchParams({ page: String(page), limit: '25', sfw: 'true' });
  return jikanFetch(`/seasons/${year}/${season}?${params.toString()}`);
}
