import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { MAX_FRIENDS, readFriends, writeFriends, type Friend } from '@/lib/friends';

interface FriendsContextValue {
  friends: Friend[];
  hasFriend: (username: string) => boolean;
  /** Devuelve false si ya existe o se alcanzó el máximo. */
  add: (username: string) => boolean;
  remove: (username: string) => void;
}

const FriendsContext = createContext<FriendsContextValue | null>(null);

/** Mantiene los amigos en memoria y los vuelca al disco en cada cambio. */
export function FriendsProvider({ children }: { children: ReactNode }) {
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    setFriends(readFriends());
  }, []);

  const persist = useCallback((next: Friend[]) => {
    setFriends(next);
    writeFriends(next);
  }, []);

  const hasFriend = useCallback(
    (username: string) => friends.some((f) => f.username.toLowerCase() === username.toLowerCase()),
    [friends],
  );

  const add = useCallback(
    (username: string) => {
      if (hasFriend(username) || friends.length >= MAX_FRIENDS) return false;
      persist([...friends, { username, addedAt: Date.now() }]);
      return true;
    },
    [friends, hasFriend, persist],
  );

  const remove = useCallback(
    (username: string) =>
      persist(friends.filter((f) => f.username.toLowerCase() !== username.toLowerCase())),
    [friends, persist],
  );

  const value = useMemo(() => ({ friends, hasFriend, add, remove }), [friends, hasFriend, add, remove]);
  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

export function useFriends(): FriendsContextValue {
  const context = useContext(FriendsContext);
  if (!context) throw new Error('useFriends debe usarse dentro de FriendsProvider');
  return context;
}
