import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

/**
 * Etiqueta corta para saber qué corre el dispositivo, por ejemplo:
 *   "v1.0.0 · dev"            → Metro / development build
 *   "v1.0.0 · build original" → JS embebido en la APK instalada
 *   "v1.0.0 · OTA a1b2c3d"    → update recibido por EAS Update
 */
export function getVersionLabel(): string {
  const version = Constants.expoConfig?.version ?? '?';
  let suffix: string;
  if (__DEV__ || !Updates.isEnabled) {
    suffix = 'dev';
  } else if (Updates.isEmbeddedLaunch || !Updates.updateId) {
    suffix = 'build original';
  } else {
    suffix = `OTA ${Updates.updateId.slice(0, 7)}`;
  }
  return `v${version} · ${suffix}`;
}
