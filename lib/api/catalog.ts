/**
 * Catálogo de anime: intenta Jikan primero y, si falla (p. ej. 504),
 * usa la API pública de MAL con el Client ID.
 */
import { getAnimeCharacters, getAnimeFull, searchAnime, type JikanAnime, type JikanCharacterEntry, type JikanPage } from '@/lib/api/jikan';
import { getAnimeFullMal, searchAnimeMal } from '@/lib/api/mal-public';

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
