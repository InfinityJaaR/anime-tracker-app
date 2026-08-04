/**
 * Lecturas públicas de la API oficial de MAL v2 usando solo el Client ID
 * (header X-MAL-CLIENT-ID). No requiere login OAuth.
 * Se usa como fallback cuando Jikan responde 504 / está caído.
 */
import type { JikanAnime, JikanNamedResource, JikanPage } from '@/lib/api/jikan';

const MAL_API = 'https://api.myanimelist.net/v2';
const CLIENT_ID = process.env.EXPO_PUBLIC_MAL_CLIENT_ID ?? '';

const DETAIL_FIELDS = [
  'id',
  'title',
  'main_picture',
  'alternative_titles',
  'start_date',
  'end_date',
  'synopsis',
  'mean',
  'rank',
  'popularity',
  'num_list_users',
  'media_type',
  'status',
  'genres',
  'num_episodes',
  'start_season',
  'broadcast',
  'source',
  'rating',
  'studios',
].join(',');

const SEARCH_FIELDS = [
  'id',
  'title',
  'main_picture',
  'alternative_titles',
  'start_date',
  'end_date',
  'mean',
  'media_type',
  'status',
  'num_episodes',
].join(',');

interface MalPicture {
  medium?: string;
  large?: string;
}

interface MalGenre {
  id: number;
  name: string;
}

interface MalStudio {
  id: number;
  name: string;
}

interface MalAnimeDetail {
  id: number;
  title: string;
  main_picture?: MalPicture;
  alternative_titles?: { en?: string; ja?: string; synonyms?: string[] };
  start_date?: string;
  end_date?: string;
  synopsis?: string;
  mean?: number;
  rank?: number;
  popularity?: number;
  num_list_users?: number;
  media_type?: string;
  status?: string;
  genres?: MalGenre[];
  num_episodes?: number;
  start_season?: { year: number; season: string };
  broadcast?: { day_of_the_week?: string; start_time?: string };
  source?: string;
  rating?: string;
  studios?: MalStudio[];
}

function requireClientId() {
  if (!CLIENT_ID) {
    throw new Error('Falta EXPO_PUBLIC_MAL_CLIENT_ID para el fallback de MAL');
  }
}

async function malPublicFetch<T>(path: string): Promise<T> {
  requireClientId();
  const response = await fetch(`${MAL_API}${path}`, {
    headers: { 'X-MAL-CLIENT-ID': CLIENT_ID },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`MAL ${response.status}: ${body || response.statusText}`);
  }
  return (await response.json()) as T;
}

function pictureToImages(picture?: MalPicture): JikanAnime['images'] {
  const url = picture?.large ?? picture?.medium ?? '';
  return {
    jpg: {
      image_url: url,
      large_image_url: picture?.large ?? url,
      small_image_url: picture?.medium ?? url,
    },
  };
}

function toNamed(resources: { id: number; name: string }[] | undefined, type: string): JikanNamedResource[] {
  return (resources ?? []).map((r) => ({
    mal_id: r.id,
    type,
    name: r.name,
    url: `https://myanimelist.net/${type}/${r.id}`,
  }));
}

function malStatusLabel(status?: string): string | null {
  switch (status) {
    case 'finished_airing':
      return 'Finished Airing';
    case 'currently_airing':
      return 'Currently Airing';
    case 'not_yet_aired':
      return 'Not yet aired';
    default:
      return status ?? null;
  }
}

function malMediaType(mediaType?: string): string | null {
  if (!mediaType) return null;
  return mediaType.toUpperCase() === 'TV' ? 'TV' : mediaType;
}

/** Convierte un nodo/detalle de MAL al shape que usa la UI (compatible con Jikan). */
export function malAnimeToJikan(anime: MalAnimeDetail): JikanAnime {
  const from = anime.start_date ?? null;
  const to = anime.end_date ?? null;
  return {
    mal_id: anime.id,
    url: `https://myanimelist.net/anime/${anime.id}`,
    images: pictureToImages(anime.main_picture),
    title: anime.title,
    title_english: anime.alternative_titles?.en ?? null,
    title_japanese: anime.alternative_titles?.ja ?? null,
    title_synonyms: anime.alternative_titles?.synonyms ?? [],
    type: malMediaType(anime.media_type),
    source: anime.source ?? null,
    episodes: anime.num_episodes ?? null,
    status: malStatusLabel(anime.status),
    airing: anime.status === 'currently_airing',
    aired: {
      from,
      to,
      string: [from, to].filter(Boolean).join(' to ') || undefined,
    },
    rating: anime.rating ?? null,
    score: anime.mean ?? null,
    rank: anime.rank ?? null,
    popularity: anime.popularity ?? null,
    members: anime.num_list_users ?? null,
    synopsis: anime.synopsis ?? null,
    season: anime.start_season?.season ?? null,
    year: anime.start_season?.year ?? null,
    broadcast: {
      day: anime.broadcast?.day_of_the_week ?? null,
      time: anime.broadcast?.start_time ?? null,
      string: anime.broadcast
        ? `${anime.broadcast.day_of_the_week ?? ''} ${anime.broadcast.start_time ?? ''}`.trim()
        : null,
    },
    studios: toNamed(anime.studios, 'anime/producer'),
    genres: toNamed(anime.genres, 'anime/genre'),
    themes: [],
    demographics: [],
  };
}

/** Búsqueda pública vía MAL (sin OAuth). */
export async function searchAnimeMal(query: string, limit = 20): Promise<JikanPage<JikanAnime>> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    fields: SEARCH_FIELDS,
    nsfw: 'true',
  });
  const page = await malPublicFetch<{ data: { node: MalAnimeDetail }[] }>(
    `/anime?${params.toString()}`,
  );
  const data = page.data.map((item) => malAnimeToJikan(item.node));
  return {
    data,
    pagination: {
      last_visible_page: 1,
      has_next_page: false,
      current_page: 1,
      items: { count: data.length, total: data.length, per_page: limit },
    },
  };
}

/** Detalle público vía MAL (sin OAuth). */
export async function getAnimeFullMal(malId: number): Promise<JikanAnime> {
  const params = new URLSearchParams({ fields: DETAIL_FIELDS });
  const anime = await malPublicFetch<MalAnimeDetail>(`/anime/${malId}?${params.toString()}`);
  return malAnimeToJikan(anime);
}
