/**
 * Lista pública de otros usuarios de MAL (`GET /v2/users/{usuario}/animelist`).
 * Solo necesita el Client ID de la app; funciona únicamente con listas públicas.
 */
import type { MalListItem, MalListPage, MalWatchStatus } from '@/lib/api/mal';

const MAL_API = 'https://api.myanimelist.net/v2';
const CLIENT_ID = process.env.EXPO_PUBLIC_MAL_CLIENT_ID ?? '';
const FIELDS = 'list_status,num_episodes,status,mean,media_type';

export type FriendErrorKind = 'not_found' | 'private' | 'network';

export class FriendListError extends Error {
  constructor(
    readonly kind: FriendErrorKind,
    message: string,
  ) {
    super(message);
  }
}

interface ListOptions {
  status?: MalWatchStatus;
  limit: number;
}

/** Entradas del usuario ordenadas por última actualización (más recientes primero). */
export async function getFriendAnimeList(
  username: string,
  { status, limit }: ListOptions,
): Promise<MalListItem[]> {
  if (!CLIENT_ID) throw new FriendListError('network', 'Falta EXPO_PUBLIC_MAL_CLIENT_ID');
  const params = new URLSearchParams({
    fields: FIELDS,
    limit: String(limit),
    sort: 'list_updated_at',
    nsfw: 'true',
  });
  if (status) params.set('status', status);

  let response: Response;
  try {
    response = await fetch(`${MAL_API}/users/${encodeURIComponent(username)}/animelist?${params}`, {
      headers: { 'X-MAL-CLIENT-ID': CLIENT_ID },
    });
  } catch {
    throw new FriendListError('network', 'No se pudo conectar con MyAnimeList');
  }
  if (response.status === 404) throw new FriendListError('not_found', 'Usuario no encontrado');
  if (response.status === 403) throw new FriendListError('private', 'Su lista es privada');
  if (!response.ok) throw new FriendListError('network', `MyAnimeList respondió ${response.status}`);
  return ((await response.json()) as MalListPage).data;
}

export interface FriendOverview {
  /** Lo que está viendo ahora (hasta 100). */
  watching: MalListItem[];
  /** Últimas 30 actualizaciones de cualquier estado. */
  recent: MalListItem[];
}

/** Dos consultas por amigo: lo que ve ahora y su actividad reciente. */
export async function getFriendOverview(username: string): Promise<FriendOverview> {
  const watching = await getFriendAnimeList(username, { status: 'watching', limit: 100 });
  const recent = await getFriendAnimeList(username, { limit: 30 });
  return { watching, recent };
}

/** Comprueba que el usuario existe y que su lista es pública (lanza FriendListError si no). */
export async function validateFriend(username: string): Promise<void> {
  await getFriendAnimeList(username, { limit: 1 });
}
