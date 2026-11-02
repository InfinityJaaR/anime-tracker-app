/**
 * Catálogo de anime: intenta Jikan primero y, si falla (p. ej. 504),
 * usa la API pública de MAL con el Client ID.
 */
import { getAnimeCharacters, getAnimeFull, getSeasonNow, getSeasonPage, searchAnime, type JikanAnime, type JikanCharacterEntry, type JikanPage } from '@/lib/api/jikan';
import {
  getAnimeFullMal,
  getSeasonAnime,
  searchAnimeMal,
  seasonOf,
  type AnimeSeason,
} from '@/lib/api/mal-public';

export async function searchAnimeCatalog(query: string): Promise<JikanPage<JikanAnime>> {
  try {
    return await searchAnime(query);
  } catch (jikanError) {
    try {
      return await searchAnimeMal(query);
    } catch {
      throw jikanError;
    }
  }
}

export async function getAnimeFullCatalog(malId: number): Promise<JikanAnime> {
  try {
    return await getAnimeFull(malId);
  } catch (jikanError) {
    try {
      return await getAnimeFullMal(malId);
    } catch {
      throw jikanError;
    }
  }
}

/** Personajes solo existen en Jikan; se reintentan allí. */
export function getAnimeCharactersCatalog(malId: number): Promise<JikanCharacterEntry[]> {
  return getAnimeCharacters(malId);
}

/** Animes en emisión esta temporada: Tenrai primero y, si falla, la temporada de MAL. */
export async function getAiringSeasonCatalog(): Promise<JikanAnime[]> {
  try {
    return (await getSeasonNow()).filter((anime) => anime.airing !== false);
  } catch (catalogError) {
    try {
      const { year, season } = seasonOf(new Date());
      return (await getSeasonAnime(year, season, 100)).filter((anime) => anime.airing);
    } catch {
      throw catalogError;
    }
  }
}

/**
 * Una página de una temporada: Tenrai y, si falla la primera página, la temporada
 * completa de MAL como página única (sin paginación).
 */
export async function getSeasonPageCatalog(
  year: number,
  season: AnimeSeason,
  page: number,
): Promise<JikanPage<JikanAnime>> {
  try {
    return await getSeasonPage(year, season, page);
  } catch (catalogError) {
    if (page > 1) throw catalogError;
    try {
      const data = await getSeasonAnime(year, season, 100);
      return {
        data,
        pagination: {
          current_page: 1,
          last_visible_page: 1,
          has_next_page: false,
          items: { count: data.length, total: data.length, per_page: 100 },
        },
      };
    } catch {
      throw catalogError;
    }
  }
}
