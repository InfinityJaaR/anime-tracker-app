/**
 * Personajes favoritos guardados en el dispositivo.
 *
 * La API v2 de MyAnimeList no permite modificar los favoritos del perfil, así que
 * esta lista es local. Se guarda como JSON en el directorio de documentos usando la
 * API de expo-file-system de SDK 54 (File/Paths); las funciones antiguas del módulo
 * (writeAsStringAsync y compañía) lanzan error en runtime.
 */
import { File, Paths } from 'expo-file-system';

export interface FavoriteCharacter {
  id: number;
  name: string;
  imageUrl?: string;
  animeId: number;
  animeTitle: string;
  /** Epoch en ms, para ordenar de más reciente a más antiguo. */
  addedAt: number;
}

const FILE_NAME = 'favorite-characters.json';

function favoritesFile(): File {
  return new File(Paths.document, FILE_NAME);
}

/** Lee los favoritos del disco. Ante cualquier problema devuelve lista vacía. */
export function readFavorites(): FavoriteCharacter[] {
  try {
    const file = favoritesFile();
    if (!file.exists) return [];
    const parsed: unknown = JSON.parse(file.textSync());
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isFavorite);
  } catch {
    return [];
  }
}

/** Vuelca los favoritos al disco. Devuelve false si no se pudo escribir. */
export function writeFavorites(items: FavoriteCharacter[]): boolean {
  try {
    const file = favoritesFile();
    if (!file.exists) file.create();
    file.write(JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

function isFavorite(value: unknown): value is FavoriteCharacter {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'number' && typeof candidate.name === 'string';
}

/** Agrupa por anime, manteniendo los animes con favoritos más recientes arriba. */
export function groupByAnime(items: FavoriteCharacter[]) {
  const groups = new Map<number, { animeId: number; animeTitle: string; characters: FavoriteCharacter[] }>();
  for (const item of [...items].sort((a, b) => b.addedAt - a.addedAt)) {
    const group = groups.get(item.animeId);
    if (group) {
      group.characters.push(item);
    } else {
      groups.set(item.animeId, {
        animeId: item.animeId,
        animeTitle: item.animeTitle,
        characters: [item],
      });
    }
  }
  return [...groups.values()];
}
