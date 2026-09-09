/**
 * Catálogo de géneros de MyAnimeList con etiqueta en español.
 *
 * Va fijo en el código a propósito: MAL no expone un endpoint de géneros y el de
 * Jikan (/genres/anime) responde 504 habitualmente. Los IDs son los oficiales de
 * MAL, y el nombre en inglés es el que llega en el campo `genres` de la API, que
 * es contra el que se compara al filtrar.
 */
export interface Genre {
  id: number;
  /** Nombre tal cual lo devuelve MAL. */
  name: string;
  label: string;
}

export const GENRES: Genre[] = [
  { id: 1, name: 'Action', label: 'Acción' },
  { id: 2, name: 'Adventure', label: 'Aventura' },
  { id: 4, name: 'Comedy', label: 'Comedia' },
  { id: 8, name: 'Drama', label: 'Drama' },
  { id: 10, name: 'Fantasy', label: 'Fantasía' },
  { id: 14, name: 'Horror', label: 'Terror' },
  { id: 7, name: 'Mystery', label: 'Misterio' },
  { id: 22, name: 'Romance', label: 'Romance' },
  { id: 24, name: 'Sci-Fi', label: 'Ciencia ficción' },
  { id: 36, name: 'Slice of Life', label: 'Recuentos de la vida' },
  { id: 30, name: 'Sports', label: 'Deportes' },
  { id: 37, name: 'Supernatural', label: 'Sobrenatural' },
  { id: 41, name: 'Suspense', label: 'Suspenso' },
  { id: 9, name: 'Ecchi', label: 'Ecchi' },
  { id: 62, name: 'Isekai', label: 'Isekai' },
  { id: 23, name: 'School', label: 'Escolar' },
  { id: 38, name: 'Military', label: 'Militar' },
  { id: 19, name: 'Music', label: 'Música' },
  { id: 18, name: 'Mecha', label: 'Mecha' },
  { id: 40, name: 'Psychological', label: 'Psicológico' },
  { id: 17, name: 'Martial Arts', label: 'Artes marciales' },
  { id: 39, name: 'Detective', label: 'Detectives' },
  { id: 13, name: 'Historical', label: 'Histórico' },
  { id: 20, name: 'Parody', label: 'Parodia' },
];

export function genreLabel(name: string): string {
  return GENRES.find((g) => g.name === name)?.label ?? name;
}

export function genreById(id: number): Genre | undefined {
  return GENRES.find((g) => g.id === id);
}

/** Tipos de serie de MAL (`media_type`) con su etiqueta en español. */
export interface MediaType {
  /** Valor de `media_type` en MAL, ya normalizado a como lo expone la app. */
  value: string;
  label: string;
}

export const MEDIA_TYPES: MediaType[] = [
  { value: 'tv', label: 'TV' },
  { value: 'movie', label: 'Película' },
  { value: 'ova', label: 'OVA' },
  { value: 'ona', label: 'ONA' },
  { value: 'special', label: 'Especial' },
];

export function mediaTypeLabel(value?: string | null): string {
  if (!value) return '?';
  const found = MEDIA_TYPES.find((t) => t.value === value.toLowerCase());
  return found ? found.label : value.toUpperCase();
}
