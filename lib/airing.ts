/**
 * Estado de emisión de un anime a partir del próximo episodio que informa AniList.
 *
 * Ciclo semanal: cuenta atrás → "Ya disponible" durante 24 h → cuenta atrás del
 * siguiente (estimado en +7 días hasta que AniList lo confirme). Tras el último
 * episodio ya no hay más ciclos.
 */
import type { AiringInfo } from '@/lib/api/anilist';

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** Tiempo que se muestra "Ya disponible" tras emitirse un episodio. */
export const AVAILABLE_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface AiringState {
  /** Episodio al que se refiere la etiqueta (el que sale o el recién emitido). */
  episode: number;
  /** Episodios ya emitidos. */
  aired: number;
  availableNow: boolean;
  /** Milisegundos hasta `episode`; 0 si ya está disponible. */
  msLeft: number;
}

/**
 * Devuelve `null` cuando el anime ya no debe tratarse como en emisión
 * (último episodio emitido hace más de 24 h): la tarjeta vuelve al formato normal.
 * `total` es el número de episodios de MAL (0 o undefined si no se conoce).
 */
export function resolveAiringState(
  info: AiringInfo,
  total: number | undefined,
  now: number,
): AiringState | null {
  const { nextEpisode: next, airingAt } = info;
  if (now < airingAt) {
    return { episode: next, aired: next - 1, availableNow: false, msLeft: airingAt - now };
  }

  const known = total != null && total >= next ? total : 0;
  const weeks = Math.floor((now - airingAt) / WEEK_MS);
  let lastAired = next + weeks;
  let lastAiredAt = airingAt + weeks * WEEK_MS;
  if (known > 0 && lastAired >= known) {
    lastAired = known;
    lastAiredAt = airingAt + (known - next) * WEEK_MS;
  }

  if (now - lastAiredAt < AVAILABLE_WINDOW_MS) {
    return { episode: lastAired, aired: lastAired, availableNow: true, msLeft: 0 };
  }
  if (known > 0 && lastAired >= known) return null;
  return {
    episode: lastAired + 1,
    aired: lastAired,
    availableNow: false,
    msLeft: lastAiredAt + WEEK_MS - now,
  };
}
