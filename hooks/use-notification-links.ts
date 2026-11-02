import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';

import { APP_UPDATE_NOTIFICATION_TYPE, EPISODE_NOTIFICATION_TYPE } from '@/lib/notifications';

/** Al tocar una notificación: episodio nuevo → detalle del anime; APK nuevo → página de descarga. */
export function useNotificationLinks() {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const { identifier, content } = response.notification.request;
    if (content.data?.type === APP_UPDATE_NOTIFICATION_TYPE) {
      // Solo se abren enlaces de GitHub: el dato viene de una notificación local propia.
      const url = String(content.data.url ?? '');
      if (handled.current !== identifier && url.startsWith('https://github.com/')) {
        handled.current = identifier;
        void Linking.openURL(url);
      }
      return;
    }
    if (content.data?.type !== EPISODE_NOTIFICATION_TYPE) return;
    const animeId = Number(content.data.animeId);
    if (!Number.isFinite(animeId) || handled.current === identifier) return;
    handled.current = identifier;
    router.push(`/anime/${animeId}`);
  }, [response, router]);
}
