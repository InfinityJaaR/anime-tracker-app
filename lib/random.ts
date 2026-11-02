import type { MalListItem } from '@/lib/api/mal';

/** Anime al azar entre los de tu lista en Plan to Watch; `null` si no hay ninguno. */
export function pickRandomPlanToWatch(items: MalListItem[] | undefined): MalListItem | null {
  const pool = (items ?? []).filter((item) => item.list_status.status === 'plan_to_watch');
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
