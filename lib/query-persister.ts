/**
 * Persistencia del caché de TanStack Query en disco.
 *
 * Sin esto, cada arranque en frío vuelve a descargar la lista completa de MAL.
 * Se usa la API de expo-file-system de SDK 54 (File/Paths), igual que
 * lib/favorites.ts; las funciones antiguas del módulo lanzan error en runtime.
 */
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { defaultShouldDehydrateQuery, type Query } from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';

const FILE_NAME = 'react-query-cache.json';

/** Se sube a mano cuando cambia la forma de los datos cacheados. */
export const CACHE_BUSTER = 'v1';

/** El caché restaurado debe sobrevivir al gcTime del cliente (24 h). */
export const CACHE_MAX_AGE = 1000 * 60 * 60 * 24;

function cacheFile(): File {
  return new File(Paths.document, FILE_NAME);
}

/**
 * Interfaz AsyncStorage mínima sobre el sistema de ficheros. Las lecturas y
 * escrituras son síncronas, que también es válido para el persister.
 */
const storage = {
  getItem: (): string | null => {
    try {
      const file = cacheFile();
      return file.exists ? file.textSync() : null;
    } catch {
      return null;
    }
  },
  setItem: (_key: string, value: string): void => {
    try {
      const file = cacheFile();
      if (!file.exists) file.create();
      file.write(value);
    } catch {
      // Si no se puede escribir, la app sigue funcionando solo en memoria.
    }
  },
  removeItem: (): void => {
    try {
      const file = cacheFile();
      if (file.exists) file.delete();
    } catch {
      // Nada que hacer: el fichero ya no está o no es accesible.
    }
  },
};

export const queryPersister = createAsyncStoragePersister({
  storage,
  // La lista completa es el JSON más grande de la app y cada mutación optimista
  // dispara una reescritura, así que se espacian.
  throttleTime: 3000,
});

/**
 * Las búsquedas llevan el texto buscado en la clave, así que persistirlas haría
 * crecer el fichero sin límite. El resto de scopes sí interesa conservarlos.
 */
export function shouldPersistQuery(query: Query): boolean {
  if (!defaultShouldDehydrateQuery(query)) return false;
  const [scope, kind] = query.queryKey as [string, string?];
  if (kind === 'search' || kind === 'global-search') return false;
  return scope === 'mal' || scope === 'catalog' || scope === 'discover';
}
