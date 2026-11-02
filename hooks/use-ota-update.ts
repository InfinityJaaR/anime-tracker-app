import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { registerUpdateCheckTask } from '@/lib/background-update-task';
import {
  ensureUpdateChannel,
  requestNotificationPermission,
  UPDATE_NOTIFICATION_TYPE,
} from '@/lib/notifications';

/**
 * Gestiona las actualizaciones OTA (EAS Update).
 *
 * - En el arranque en frío expo-updates ya comprueba y descarga solo
 *   (`checkAutomatically: ALWAYS`, valor por defecto).
 * - Además, cada vez que la app vuelve a primer plano volvemos a comprobar:
 *   en Android los usuarios rara vez cierran la app del todo y sin esto solo
 *   se enterarían del update en el siguiente arranque en frío.
 * - En development build / Expo Go (`__DEV__` o `!Updates.isEnabled`) no hace nada.
 */
export function useOtaUpdate() {
  const enabled = !__DEV__ && Updates.isEnabled;
  const { isUpdatePending } = Updates.useUpdates();
  const checking = useRef(false);

  const checkAndFetch = useCallback(async () => {
    if (!enabled || checking.current) return;
    checking.current = true;
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        await Updates.fetchUpdateAsync();
      }
    } catch {
      // Sin red o servidor no disponible: no interrumpir al usuario.
    } finally {
      checking.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') void checkAndFetch();
    };
    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, [enabled, checkAndFetch]);

  // Permiso de notificaciones y tarea de fondo que avisa de updates con la app cerrada.
  useEffect(() => {
    if (!enabled) return;
    void (async () => {
      try {
        if (await requestNotificationPermission()) {
          await ensureUpdateChannel();
        }
        await registerUpdateCheckTask();
      } catch {
        // Sin permiso o sin tarea de fondo queda el aviso al abrir la app.
      }
    })();
  }, [enabled]);

  const reload = useCallback(async () => {
    try {
      await Updates.reloadAsync();
    } catch {
      // Si falla el reload, el update se aplicará en el siguiente arranque.
    }
  }, []);

  // Al tocar la notificación de update se aplica en cuanto esté descargado.
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledResponse = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled || !isUpdatePending || !lastResponse) return;
    const data = lastResponse.notification.request.content.data;
    if (data?.type !== UPDATE_NOTIFICATION_TYPE) return;
    const responseId = lastResponse.notification.request.identifier;
    if (handledResponse.current === responseId) return;
    handledResponse.current = responseId;
    void reload();
  }, [enabled, isUpdatePending, lastResponse, reload]);

  return { isUpdatePending: enabled && isUpdatePending, reload };
}
