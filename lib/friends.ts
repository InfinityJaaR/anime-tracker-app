/**
 * Amigos guardados en el dispositivo: usuarios de MyAnimeList cuya lista pública
 * se consulta. MAL no tiene sistema de amigos en su API, así que no hay solicitudes
 * ni aceptación. Se guarda como JSON con la API File/Paths de expo-file-system
 * (igual que lib/favorites.ts).
 */
import { File, Paths } from 'expo-file-system';

export interface Friend {
  /** Usuario de MAL tal como lo escribió quien lo agregó. */
  username: string;
  /** Epoch en ms. */
  addedAt: number;
}

export const MAX_FRIENDS = 20;
const FILE_NAME = 'friends.json';

function friendsFile(): File {
  return new File(Paths.document, FILE_NAME);
}

/** Los usuarios de MAL tienen 2–16 caracteres: letras, números, guion y guion bajo. */
export function isValidUsername(value: string): boolean {
  return /^[A-Za-z0-9_-]{2,16}$/.test(value);
}

function isFriend(value: unknown): value is Friend {
  const candidate = value as Friend;
  return !!candidate && typeof candidate.username === 'string' && typeof candidate.addedAt === 'number';
}

export function readFriends(): Friend[] {
  try {
    const file = friendsFile();
    if (!file.exists) return [];
    const parsed: unknown = JSON.parse(file.textSync());
    return Array.isArray(parsed) ? parsed.filter(isFriend) : [];
  } catch {
    return [];
  }
}

/** Devuelve false si no se pudo escribir. */
export function writeFriends(items: Friend[]): boolean {
  try {
    const file = friendsFile();
    if (!file.exists) file.create();
    file.write(JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}
