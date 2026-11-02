/**
 * Lógica pura de la actividad de amigos: feed ordenado, texto de cada entrada
 * y aviso de spoilers cuando un amigo va por delante de ti.
 */
import type { MalListItem, MalMyListStatus } from '@/lib/api/mal';

export interface ActivityItem {
  friend: string;
  item: MalListItem;
  /** Epoch en ms de la última actualización. */
  at: number;
}

/** Une la actividad reciente de todos los amigos, la más nueva primero. */
export function buildActivity(
  friends: { username: string; recent: MalListItem[] }[],
  limit = 50,
): ActivityItem[] {
  return friends
    .flatMap(({ username, recent }) =>
      recent.map((item) => ({
        friend: username,
        item,
        at: Date.parse(item.list_status.updated_at) || 0,
      })),
    )
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
}

/** Cuántos episodios tiene el anime ("?" si MAL no lo sabe). */
export function totalLabel(item: MalListItem): string {
  const total = item.node.num_episodes ?? 0;
  return total > 0 ? String(total) : '?';
}

/** Frase corta de lo que hizo el amigo, sin el nombre: "va por el ep 7/12", "completó"… */
export function describeActivity(item: MalListItem): string {
  const { status, num_episodes_watched: watched, score } = item.list_status;
  switch (status) {
    case 'completed':
      return score > 0 ? `completó · puntuó ${score}` : 'completó';
    case 'watching':
      return watched === 0 ? 'empezó a verlo' : `va por el ep ${watched}/${totalLabel(item)}`;
    case 'plan_to_watch':
      return 'lo agregó a su lista';
    case 'on_hold':
      return `lo pausó en el ep ${watched}`;
    case 'dropped':
      return `lo dejó en el ep ${watched}`;
  }
}

/**
 * true si el amigo va por delante de ti en un anime que tienes en tu lista
 * (Watching, On Hold o Plan to Watch). Fuera de tu lista no se avisa.
 */
export function isAhead(friend: MalMyListStatus, mine: MalMyListStatus | undefined): boolean {
  if (!mine) return false;
  if (mine.status !== 'watching' && mine.status !== 'on_hold' && mine.status !== 'plan_to_watch') {
    return false;
  }
  if (friend.status === 'completed') return true;
  return friend.num_episodes_watched > mine.num_episodes_watched;
}

/** Iniciales para el avatar (MAL no da la foto de otros usuarios). */
export function initialsOf(username: string): string {
  return username.slice(0, 2).toUpperCase();
}
