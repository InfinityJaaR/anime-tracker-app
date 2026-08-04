/**
 * Cliente de la API pública de Jikan v4 (https://docs.api.jikan.moe/).
 * No requiere autenticación. Los IDs coinciden con los de MyAnimeList.
 *
 * Jikan a veces responde 504 cuando no puede alcanzar MAL; por eso hay
 * reintentos con backoff. Para búsqueda/detalle también hay fallback a MAL
 * (ver lib/api/catalog.ts).
 */

const JIKAN_API = 'https://api.jikan.moe/v4';
const RETRYABLE = new Set([429, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

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
      const response = await fetch(`${JIKAN_API}${path}`);
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

      const error = new Error(`Jikan ${response.status}: ${message || response.statusText}`);
      lastError = error;

      if (!RETRYABLE.has(response.status) || attempt === MAX_ATTEMPTS) {
        throw error;
      }
      // Backoff: 600ms, 1200ms…
      await sleep(600 * attempt);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Jikan ')) {
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

  throw lastError ?? new Error('Jikan: error desconocido');
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
