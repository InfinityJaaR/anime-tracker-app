/**
 * Géneros que el usuario no quiere ver en Recomendaciones. Se guardan en el
 * dispositivo como JSON (API File/Paths de expo-file-system SDK 54, igual que
 * lib/favorites.ts).
 */
import { File, Paths } from 'expo-file-system';
import { useCallback, useEffect, useState } from 'react';

const FILE_NAME = 'excluded-genres.json';

function excludedFile(): File {
  return new File(Paths.document, FILE_NAME);
}

export function readExcludedGenres(): number[] {
  try {
    const file = excludedFile();
    if (!file.exists) return [];
    const parsed: unknown = JSON.parse(file.textSync());
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === 'number') : [];
  } catch {
    return [];
  }
}

export function writeExcludedGenres(ids: number[]): boolean {
  try {
    const file = excludedFile();
    if (!file.exists) file.create();
    file.write(JSON.stringify(ids));
    return true;
  } catch {
    return false;
  }
}

/** IDs de géneros excluidos, cargados del disco y persistidos al cambiar. */
export function useExcludedGenres(): [number[], (ids: number[]) => void] {
  const [excluded, setExcluded] = useState<number[]>([]);

  useEffect(() => {
    setExcluded(readExcludedGenres());
  }, []);

  const update = useCallback((ids: number[]) => {
    setExcluded(ids);
    writeExcludedGenres(ids);
  }, []);

  return [excluded, update];
}
