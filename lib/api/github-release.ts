/**
 * Última versión publicada del APK, leída de GitHub Releases del repositorio
 * (público, sin autenticación). El tag debe coincidir con `expo.version`
 * (p. ej. `v1.2.0`) y el APK va como asset de la release.
 */
const RELEASES_URL = 'https://api.github.com/repos/InfinityJaaR/anime-tracker-app/releases/latest';

export interface AppRelease {
  /** Versión sin prefijo "v", p. ej. "1.2.0". */
  version: string;
  /** Enlace de descarga del APK (o la página de la release si no hay asset). */
  downloadUrl: string;
  notes: string;
}

interface GithubRelease {
  tag_name?: string;
  html_url?: string;
  body?: string | null;
  assets?: { name: string; browser_download_url: string }[];
}

/** `null` si todavía no hay ninguna release publicada. */
export async function getLatestRelease(): Promise<AppRelease | null> {
  const response = await fetch(RELEASES_URL, { headers: { Accept: 'application/vnd.github+json' } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub ${response.status}`);
  const release = (await response.json()) as GithubRelease;
  if (!release.tag_name) return null;
  const apk = release.assets?.find((asset) => asset.name.toLowerCase().endsWith('.apk'));
  return {
    version: release.tag_name.replace(/^v/i, ''),
    downloadUrl: apk?.browser_download_url ?? release.html_url ?? '',
    notes: release.body ?? '',
  };
}
