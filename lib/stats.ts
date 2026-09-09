/**
 * Lógica pura de estadísticas: rangos por animes completados, distribución de
 * géneros para el radar y totales de la lista. Todo se calcula sobre los items
 * que ya devuelve `useMyList('all')`, sin peticiones extra.
 */
import type { MalListItem, MalWatchStatus } from '@/lib/api/mal';

export interface Rank {
  /** Número máximo de animes completados que aún pertenece a este rango. */
  max: number;
  name: string;
}

export const RANKS: Rank[] = [
  { max: 2, name: 'Newb' },
  { max: 10, name: 'Kawaii' },
  { max: 25, name: 'Baka' },
  { max: 50, name: 'Moe' },
  { max: 69, name: 'Kouhai' },
  { max: 75, name: 'Senpai' },
  { max: 100, name: 'Weeb' },
  { max: 150, name: 'Tsundere' },
  { max: 200, name: 'Otaku' },
  { max: 275, name: 'Anime God' },
  { max: 350, name: 'Heavenly God' },
  { max: Infinity, name: "... Let's not talk about it" },
];

export interface RankProgress {
  rank: Rank;
  next?: Rank;
  completed: number;
  /** Animes que faltan para el siguiente rango (0 si ya es el último). */
  remaining: number;
  /** Avance dentro del rango actual, de 0 a 1. */
  progress: number;
}

/** Rango actual y avance hacia el siguiente según animes completados. */
export function computeRank(completed: number): RankProgress {
  const index = RANKS.findIndex((r) => completed <= r.max);
  const rank = RANKS[index] ?? RANKS[RANKS.length - 1];
  const next = RANKS[index + 1];
  const floor = index > 0 ? RANKS[index - 1].max : 0;

  if (!next || !Number.isFinite(rank.max)) {
    return { rank, completed, remaining: 0, progress: 1 };
  }

  const span = rank.max - floor;
  const progress = span > 0 ? Math.min(1, Math.max(0, (completed - floor) / span)) : 1;
  return { rank, next, completed, remaining: Math.max(0, rank.max - completed + 1), progress };
}

export interface GenreStat {
  name: string;
  count: number;
  /** count dividido entre el count del género más frecuente (0-1). */
  value: number;
}

/**
 * Top N de géneros contando los animes en curso y completados.
 * El valor se normaliza contra el género más frecuente para dibujar el radar.
 */
export function computeGenreStats(items: MalListItem[], top = 8): GenreStat[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const status = item.list_status.status;
    if (status !== 'watching' && status !== 'completed') continue;
    for (const genre of item.node.genres ?? []) {
      counts.set(genre.name, (counts.get(genre.name) ?? 0) + 1);
    }
  }

  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, top);
  const max = sorted[0]?.[1] ?? 0;

  return sorted.map(([name, count]) => ({
    name,
    count,
    value: max > 0 ? count / max : 0,
  }));
}

export interface StatsSummary {
  totalAnime: number;
  episodesWatched: number;
  /** Minutos estimados = episodios vistos x duración media conocida. */
  minutesWatched: number;
  /** Media de las puntuaciones distintas de 0 (0 = sin puntuar en MAL). */
  meanScore: number;
  scoredCount: number;
  rewatching: number;
  byStatus: Record<MalWatchStatus, number>;
}

/** Duración por defecto cuando MAL no informa `average_episode_duration`. */
const FALLBACK_EPISODE_MINUTES = 24;

export function computeSummary(items: MalListItem[]): StatsSummary {
  const byStatus: Record<MalWatchStatus, number> = {
    watching: 0,
    completed: 0,
    on_hold: 0,
    dropped: 0,
    plan_to_watch: 0,
  };

  let episodesWatched = 0;
  let minutesWatched = 0;
  let scoreSum = 0;
  let scoredCount = 0;
  let rewatching = 0;

  for (const item of items) {
    const { status, num_episodes_watched: watched, score, is_rewatching } = item.list_status;
    byStatus[status] = (byStatus[status] ?? 0) + 1;
    episodesWatched += watched;

    const seconds = item.node.average_episode_duration ?? 0;
    const minutesPerEpisode = seconds > 0 ? seconds / 60 : FALLBACK_EPISODE_MINUTES;
    minutesWatched += watched * minutesPerEpisode;

    if (score > 0) {
      scoreSum += score;
      scoredCount += 1;
    }
    if (is_rewatching) rewatching += 1;
  }

  return {
    totalAnime: items.length,
    episodesWatched,
    minutesWatched: Math.round(minutesWatched),
    meanScore: scoredCount > 0 ? scoreSum / scoredCount : 0,
    scoredCount,
    rewatching,
    byStatus,
  };
}

/** 3215 → "2d 5h 35m" (omite las unidades vacías). */
export function formatWatchTime(minutes: number): string {
  if (minutes <= 0) return '0m';
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = Math.round(minutes % 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 && days === 0) parts.push(`${mins}m`);
  return parts.join(' ') || '0m';
}
