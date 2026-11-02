/**
 * Tarea periódica con la app cerrada: reprograma los avisos de episodios nuevos
 * (lib/airing-notifications.ts) y comprueba updates OTA.
 *
 * Android ejecuta la tarea cuando quiere (intervalo mínimo, y más espaciado con
 * ahorro de batería), así que el aviso no es instantáneo. Si hay update se
 * descarga y se avisa con una notificación local; al tocarla, use-ota-update.ts
 * lo aplica. `defineTask` debe ejecutarse al cargar el bundle (se importa desde
 * app/_layout.tsx) para que la tarea exista también en el arranque sin interfaz.
 */
import * as BackgroundTask from 'expo-background-task';
import { File, Paths } from 'expo-file-system';
import * as TaskManager from 'expo-task-manager';
import * as Updates from 'expo-updates';

import { refreshEpisodeNotifications } from '@/lib/airing-notifications';
import { getLatestRelease } from '@/lib/api/github-release';
import { getInstalledVersion, isNewerVersion } from '@/lib/app-update';
import { notifyAppUpdateAvailable, notifyUpdateAvailable } from '@/lib/notifications';

const TASK_NAME = 'ota-update-check';
/** Minutos; Android no baja de 15. */
const MINIMUM_INTERVAL = 60;
const NOTIFIED_FILE = 'last-notified-update.txt';

function notifiedFile(): File {
  return new File(Paths.document, NOTIFIED_FILE);
}

function readNotifiedId(): string | null {
  try {
    const file = notifiedFile();
    return file.exists ? file.textSync().trim() : null;
  } catch {
    return null;
  }
}

function writeNotifiedId(id: string): void {
  try {
    const file = notifiedFile();
    if (!file.exists) file.create();
    file.write(id);
  } catch {
    // Sin persistir solo se arriesga repetir la notificación una vez.
  }
}

const RELEASE_FILE = 'last-notified-release.txt';

/** Avisa una sola vez por versión cuando hay un APK más nuevo en GitHub Releases. */
async function notifyIfNewRelease(): Promise<void> {
  const release = await getLatestRelease();
  if (!release || !isNewerVersion(release.version, getInstalledVersion())) return;
  try {
    const file = new File(Paths.document, RELEASE_FILE);
    if (file.exists && file.textSync().trim() === release.version) return;
    await notifyAppUpdateAvailable(release.version, release.downloadUrl);
    if (!file.exists) file.create();
    file.write(release.version);
  } catch {
    // Sin persistir solo se arriesga repetir el aviso.
  }
}

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    if (__DEV__ || !Updates.isEnabled) return BackgroundTask.BackgroundTaskResult.Success;

    // Reprograma los avisos de episodios; un fallo aquí no debe impedir el chequeo OTA.
    await refreshEpisodeNotifications().catch(() => {});
    // Un APK nuevo cambia el runtime: el OTA no llega, así que se avisa aparte.
    await notifyIfNewRelease().catch(() => {});

    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return BackgroundTask.BackgroundTaskResult.Success;

    const updateId = check.manifest?.id ?? null;
    await Updates.fetchUpdateAsync();

    // Una misma versión se avisa una sola vez aunque la tarea corra varias veces.
    if (updateId && readNotifiedId() === updateId) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }
    await notifyUpdateAvailable();
    if (updateId) writeNotifiedId(updateId);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Registra la tarea periódica; es seguro llamarla en cada arranque. */
export async function registerUpdateCheckTask(): Promise<void> {
  if (__DEV__ || !Updates.isEnabled) return;
  try {
    if (await TaskManager.isTaskRegisteredAsync(TASK_NAME)) return;
    await BackgroundTask.registerTaskAsync(TASK_NAME, { minimumInterval: MINIMUM_INTERVAL });
  } catch {
    // Sin tarea de fondo queda el aviso al abrir la app.
  }
}
