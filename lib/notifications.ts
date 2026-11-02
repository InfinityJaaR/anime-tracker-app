/**
 * Notificaciones locales para avisar de un update OTA descargado en segundo plano.
 * No usa push remoto: la notificación la programa la propia app (ver
 * lib/background-update-task.ts), así que no hace falta Firebase ni servidor.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const UPDATE_CHANNEL_ID = 'updates';
export const UPDATE_NOTIFICATION_TYPE = 'ota-update';
export const APP_UPDATE_NOTIFICATION_TYPE = 'app-update';
export const EPISODE_CHANNEL_ID = 'episodes';
export const EPISODE_NOTIFICATION_TYPE = 'episode';

/**
 * En primer plano el aviso de update ya tiene su banner propio, así que solo se
 * muestran las del sistema para episodios nuevos.
 */
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const show = notification.request.content.data?.type === EPISODE_NOTIFICATION_TYPE;
    return {
      shouldShowBanner: show,
      shouldShowList: show,
      shouldPlaySound: false,
      shouldSetBadge: false,
    };
  },
});

export async function ensureUpdateChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(UPDATE_CHANNEL_ID, {
    name: 'Actualizaciones',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function ensureEpisodeChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(EPISODE_CHANNEL_ID, {
    name: 'Episodios nuevos',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Pide el permiso (Android 13+) solo si aún no se decidió. Devuelve si quedó concedido. */
export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

export async function notifyUpdateAvailable(): Promise<void> {
  await ensureUpdateChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Nueva versión disponible',
      body: 'Toca para abrir Anime Tracker y aplicar la actualización.',
      data: { type: UPDATE_NOTIFICATION_TYPE },
    },
    trigger: Platform.OS === 'android' ? { channelId: UPDATE_CHANNEL_ID } : null,
  });
}

/** Aviso de que hay un APK más nuevo; al tocarlo se abre `url` (ver use-notification-links). */
export async function notifyAppUpdateAvailable(version: string, url: string): Promise<void> {
  await ensureUpdateChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Versión ${version} disponible`,
      body: 'Toca para descargar e instalar la nueva versión de Anime Tracker.',
      data: { type: APP_UPDATE_NOTIFICATION_TYPE, url },
    },
    trigger: Platform.OS === 'android' ? { channelId: UPDATE_CHANNEL_ID } : null,
  });
}
