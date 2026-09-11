/**
 * El callback OAuth de MAL (animetrackerapp://redirect?code=...) llega a la vez
 * a expo-web-browser, que es quien completa el login, y al router, que intentaba
 * navegar a una ruta /redirect inexistente y mostraba "Unmatched Route".
 *
 * Devolver cadena vacía descarta el enlace sin navegar: expo-router solo avisa
 * al listener cuando el valor devuelto es truthy.
 */
const AUTH_CALLBACK = 'animetrackerapp://redirect';

export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): string {
  try {
    if (path.startsWith(AUTH_CALLBACK)) {
      // En arranque en frío no hay pantalla previa que conservar.
      return initial ? '/' : '';
    }
    return path;
  } catch {
    return '/';
  }
}
