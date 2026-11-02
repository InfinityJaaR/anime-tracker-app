import Constants from 'expo-constants';

/** Versión del APK instalado (`expo.version`). */
export function getInstalledVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

/** true si `latest` es estrictamente mayor que `current` (comparación numérica por partes). */
export function isNewerVersion(latest: string, current: string): boolean {
  const a = latest.split('.').map((part) => parseInt(part, 10) || 0);
  const b = current.split('.').map((part) => parseInt(part, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}
