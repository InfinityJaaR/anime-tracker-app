import * as Updates from 'expo-updates';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

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

  const reload = useCallback(async () => {
    try {
      await Updates.reloadAsync();
    } catch {
      // Si falla el reload, el update se aplicará en el siguiente arranque.
    }
  }, []);

  return { isUpdatePending: enabled && isUpdatePending, reload };
}
