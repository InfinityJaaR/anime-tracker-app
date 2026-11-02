import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { getInstalledVersion, isNewerVersion } from '@/lib/app-update';
import { getLatestRelease, type AppRelease } from '@/lib/api/github-release';

export const APP_RELEASE_KEY = ['app-release'] as const;

/**
 * Detecta si hay un APK más nuevo en GitHub Releases. Un OTA no sirve aquí: un
 * cambio de `expo.version` cambia el runtime y las versiones viejas no lo reciben.
 * Se consulta al abrir y al volver a primer plano (como mucho una vez por hora).
 */
export function useAppUpdate(): { release: AppRelease | null; isChecking: boolean; refetch: () => void } {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: APP_RELEASE_KEY,
    enabled: !__DEV__,
    staleTime: 60 * 60 * 1000,
    retry: 1,
    queryFn: getLatestRelease,
  });

  useEffect(() => {
    if (__DEV__) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void queryClient.invalidateQueries({ queryKey: APP_RELEASE_KEY, refetchType: 'active' });
      }
    });
    return () => subscription.remove();
  }, [queryClient]);

  const latest = query.data;
  const release = latest && isNewerVersion(latest.version, getInstalledVersion()) ? latest : null;
  return { release, isChecking: query.isFetching, refetch: () => void query.refetch() };
}
