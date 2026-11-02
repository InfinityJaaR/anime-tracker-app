/**
 * Notificaciones locales "ya salió el episodio N" para los animes en Watching
 * que están en emisión. Se programan a la hora exacta de AniList y se
 * reprograman en cada refresco (app abierta o tarea de fondo).
 */
import { File, Paths } from 'expo-file-system';
import * as Notifications from 'expo-notifications';

import { WEEK_MS } from '@/lib/airing';
import { getAiringSchedule, type AiringSchedule } from '@/lib/api/anilist';
import { ensureEpisodeChannel, EPISODE_CHANNEL_ID, EPISODE_NOTIFICATION_TYPE } from '@/lib/notifications';

const ID_PREFIX = 'ep-';
const FILE_NAME = 'watching-airing.json';
/** Episodios por anime que se dejan programados (el siguiente y los extrapolados). */
const EPISODES_AHEAD = 3;
const MAX_WEEKS_SCAN = 60;

export interface WatchingAiring {
  malId: number;
  title: string;
  /** Episodios totales según MAL; 0 si no se conoce. */
  totalEpisodes: number;
}

function entriesFile(): File {
  return new File(Paths.document, FILE_NAME);
}

/** Guarda los animes a vigilar para que la tarea de fondo no necesite el token de MAL. */
export function saveWatchingAiring(entries: WatchingAiring[]): void {
  try {
    const file = entriesFile();
    if (!file.exists) file.create();
    file.write(JSON.stringify(entries));
  } catch {
    // Sin persistir solo se pierde el refresco en segundo plano.
  }
}

export function readWatchingAiring(): WatchingAiring[] {
  try {
    const file = entriesFile();
    if (!file.exists) return [];
    const parsed: unknown = JSON.parse(file.textSync());
    return Array.isArray(parsed)
      ? parsed.filter(
          (e): e is WatchingAiring =>
            !!e && typeof e.malId === 'number' && typeof e.title === 'string',
        )
      : [];
  } catch {
    return [];
  }
}

interface Planned {
  identifier: string;
  title: string;
  episode: number;
  when: number;
  animeId: number;
}

/** Próximas emisiones futuras: la de AniList y las siguientes estimadas a +7 días. */
function planFor(entry: WatchingAiring, schedule: AiringSchedule, now: number): Planned[] {
  const info = schedule[entry.malId];
  if (!info) return [];
  const planned: Planned[] = [];
  for (let week = 0; week < MAX_WEEKS_SCAN && planned.length < EPISODES_AHEAD; week++) {
    const episode = info.nextEpisode + week;
    if (entry.totalEpisodes > 0 && episode > entry.totalEpisodes) break;
    const when = info.airingAt + week * WEEK_MS;
    if (when <= now) continue;
    planned.push({
      identifier: `${ID_PREFIX}${entry.malId}-${episode}`,
      title: entry.title,
      episode,
      when,
      animeId: entry.malId,
    });
  }
  return planned;
}

/** Deja programadas exactamente las notificaciones que corresponden y cancela el resto. */
export async function syncEpisodeNotifications(
  entries: WatchingAiring[],
  schedule: AiringSchedule,
  now = Date.now(),
): Promise<void> {
  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) return;
  await ensureEpisodeChannel();

  const planned = entries.flatMap((entry) => planFor(entry, schedule, now));
  const wanted = new Set(planned.map((p) => p.identifier));

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    existing
      .filter((n) => n.identifier.startsWith(ID_PREFIX) && !wanted.has(n.identifier))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  for (const item of planned) {
    // Mismo identificador = reemplaza la programada, así la hora se corrige sola.
    await Notifications.scheduleNotificationAsync({
      identifier: item.identifier,
      content: {
        title: item.title,
        body: `Ya salió el episodio ${item.episode}`,
        data: { type: EPISODE_NOTIFICATION_TYPE, animeId: item.animeId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: item.when,
        channelId: EPISODE_CHANNEL_ID,
      },
    });
  }
}

/** Refresco sin interfaz (tarea de fondo): relee el calendario y reprograma. */
export async function refreshEpisodeNotifications(): Promise<void> {
  const entries = readWatchingAiring();
  if (entries.length === 0) {
    await syncEpisodeNotifications([], {});
    return;
  }
  const schedule = await getAiringSchedule(entries.map((e) => e.malId));
  await syncEpisodeNotifications(entries, schedule);
}
