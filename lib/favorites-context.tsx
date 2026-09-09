import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { readFavorites, writeFavorites, type FavoriteCharacter } from '@/lib/favorites';

interface FavoritesContextValue {
  favorites: FavoriteCharacter[];
  isLoading: boolean;
  isFavorite: (characterId: number) => boolean;
  /** Alterna el favorito y devuelve true si quedó marcado. */
  toggle: (character: Omit<FavoriteCharacter, 'addedAt'>) => boolean;
  remove: (characterId: number) => void;
  clear: () => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

/**
 * Mantiene los favoritos en memoria y los vuelca al disco en cada cambio.
 * La lectura es síncrona y muy pequeña, así que se hace una vez al montar.
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteCharacter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setFavorites(readFavorites());
    setIsLoading(false);
  }, []);

  const persist = useCallback((next: FavoriteCharacter[]) => {
    setFavorites(next);
    writeFavorites(next);
  }, []);

  const isFavorite = useCallback(
    (characterId: number) => favorites.some((f) => f.id === characterId),
    [favorites],
  );

  const toggle = useCallback(
    (character: Omit<FavoriteCharacter, 'addedAt'>) => {
      const exists = favorites.some((f) => f.id === character.id);
      persist(
        exists
          ? favorites.filter((f) => f.id !== character.id)
          : [{ ...character, addedAt: Date.now() }, ...favorites],
      );
      return !exists;
    },
    [favorites, persist],
  );

  const remove = useCallback(
    (characterId: number) => persist(favorites.filter((f) => f.id !== characterId)),
    [favorites, persist],
  );

  const clear = useCallback(() => persist([]), [persist]);

  const value = useMemo(
    () => ({ favorites, isLoading, isFavorite, toggle, remove, clear }),
    [favorites, isLoading, isFavorite, toggle, remove, clear],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites debe usarse dentro de FavoritesProvider');
  }
  return context;
}
