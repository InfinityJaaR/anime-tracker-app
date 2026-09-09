/**
 * Cliente de la API oficial de MyAnimeList v2 (https://myanimelist.net/apiconfig/references/api/v2).
 * Requiere un access token OAuth2 (ver lib/auth). MAL es la fuente de verdad de las listas.
 */

const MAL_API = 'https://api.myanimelist.net/v2';

export type MalWatchStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

export const WATCH_STATUS_LABELS: Record<MalWatchStatus, string> = {
  watching: 'Watching',
  plan_to_watch: 'Plan to Watch',
  on_hold: 'On Hold',
  completed: 'Completed',
  dropped: 'Dropped',
};

export interface MalMyListStatus {
  status: MalWatchStatus;
  score: number;
  num_episodes_watched: number;
  is_rewatching: boolean;
  updated_at: string;
}

export interface MalGenre {
  id: number;
  name: string;
}

export interface MalAnimeNode {
  id: number;
  title: string;
  main_picture?: { medium: string; large?: string };
  num_episodes?: number;
  start_date?: string;
  end_date?: string;
  /** Estado de emisión: finished_airing | currently_airing | not_yet_aired */
  status?: string;
  mean?: number;
  genres?: MalGenre[];
  /** tv | movie | ova | ona | special | music */
  media_type?: string;
  /** Duración media de un episodio en segundos. */
  average_episode_duration?: number;
  alternative_titles?: { en?: string; ja?: string; synonyms?: string[] };
}

export interface MalListItem {
  node: MalAnimeNode;
  list_status: MalMyListStatus;
}

export interface MalListPage {
  data: MalListItem[];
  paging: { next?: string; previous?: string };
}

export interface MalUser {
  id: number;
  name: string;
  picture?: string;
}

// alternative_titles permite buscar en la lista por título en inglés o sinónimos.
const LIST_FIELDS =
  'list_status,num_episodes,start_date,end_date,status,mean,genres,media_type,average_episode_duration,alternative_titles';

async function malFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${MAL_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`MAL ${response.status}: ${body || response.statusText}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

/** Usuario autenticado. */
export function getMe(token: string): Promise<MalUser> {
  return malFetch('/users/@me', token);
}

/**
 * Lista de anime del usuario, paginada por offset.
 * Si `status` se omite, devuelve la lista completa ("All").
 */
export function getMyAnimeList(
  token: string,
  status: MalWatchStatus | undefined,
  offset = 0,
  limit = 50,
): Promise<MalListPage> {
  const params = new URLSearchParams({
    fields: LIST_FIELDS,
    limit: String(limit),
    offset: String(offset),
    sort: 'list_updated_at',
    nsfw: 'true',
  });
  if (status) {
    params.set('status', status);
  }
  return malFetch(`/users/@me/animelist?${params.toString()}`, token);
}

/** Detalle mínimo de un anime en MAL, incluyendo mi estado en la lista (si existe). */
export function getAnimeWithMyStatus(
  token: string,
  animeId: number,
): Promise<MalAnimeNode & { my_list_status?: MalMyListStatus }> {
  const params = new URLSearchParams({ fields: 'my_list_status,num_episodes,title,main_picture,status' });
  return malFetch(`/anime/${animeId}?${params.toString()}`, token);
}

export interface UpdateListStatusParams {
  status?: MalWatchStatus;
  num_watched_episodes?: number;
  score?: number;
  is_rewatching?: boolean;
}

/** Crea o actualiza la entrada del anime en mi lista. */
export function updateMyListStatus(
  token: string,
  animeId: number,
  params: UpdateListStatusParams,
): Promise<MalMyListStatus> {
  const body = new URLSearchParams();
  if (params.status !== undefined) body.set('status', params.status);
  if (params.num_watched_episodes !== undefined) body.set('num_watched_episodes', String(params.num_watched_episodes));
  if (params.score !== undefined) body.set('score', String(params.score));
  if (params.is_rewatching !== undefined) body.set('is_rewatching', String(params.is_rewatching));

  return malFetch(`/anime/${animeId}/my_list_status`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

/** Elimina el anime de mi lista. */
export function deleteFromMyList(token: string, animeId: number): Promise<void> {
  return malFetch(`/anime/${animeId}/my_list_status`, token, { method: 'DELETE' });
}
