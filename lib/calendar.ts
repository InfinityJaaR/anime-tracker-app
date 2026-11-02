/**
 * Calendario semanal: junta los animes en emisión de la temporada con los de la
 * lista del usuario y los ubica en el día en que sale su próximo episodio.
 */
import { AVAILABLE_WINDOW_MS } from '@/lib/airing';
import type { AiringSchedule } from '@/lib/api/anilist';

export const CALENDAR_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface CalendarShow {
  malId: number;
  title: string;
  imageUrl?: string;
}

export interface CalendarEntry extends CalendarShow {
  episode: number;
  /** Epoch en ms de la emisión del episodio. */
  airingAt: number;
  /** El anime está en mi lista. */
  mine: boolean;
}

/** Días en el orden del calendario (lunes primero); `day` es `Date.getDay()`. */
export const CALENDAR_DAYS = [
  { day: 1, label: 'Lunes' },
  { day: 2, label: 'Martes' },
  { day: 3, label: 'Miércoles' },
  { day: 4, label: 'Jueves' },
  { day: 5, label: 'Viernes' },
  { day: 6, label: 'Sábado' },
  { day: 0, label: 'Domingo' },
] as const;

/**
 * Un episodio por anime (el próximo según AniList), dentro de los próximos 7 días
 * (o emitido hace menos de 24 h, que se muestra como "Ya disponible"), por hora.
 */
export function buildCalendar(
  shows: Iterable<CalendarShow>,
  schedule: AiringSchedule | undefined,
  mineIds: ReadonlySet<number>,
  now: number,
): CalendarEntry[] {
  if (!schedule) return [];
  const entries = new Map<number, CalendarEntry>();
  for (const show of shows) {
    const info = schedule[show.malId];
    if (!info || entries.has(show.malId)) continue;
    if (info.airingAt < now - AVAILABLE_WINDOW_MS || info.airingAt >= now + CALENDAR_WINDOW_MS) continue;
    entries.set(show.malId, {
      ...show,
      episode: info.nextEpisode,
      airingAt: info.airingAt,
      mine: mineIds.has(show.malId),
    });
  }
  return [...entries.values()].sort((a, b) => a.airingAt - b.airingAt);
}

export function weekdayOf(epochMs: number): number {
  return new Date(epochMs).getDay();
}
